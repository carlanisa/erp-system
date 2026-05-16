<?php

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Employee;
use App\Models\Projects\Task;
use App\Models\Projects\TaskApproval;
use App\Models\Projects\TaskAttachment;
use App\Models\Projects\TaskChecklistItem;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    use ApiResponse;

    public function __construct(private NotificationService $notifier)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tasks = Task::query()
            ->with(['assignee:id,name,employee_code', 'project:id,name,code', 'checklist'])
            ->when($request->project_id, fn($q) => $q->where('project_id', $request->project_id))
            ->when($request->assigned_to, fn($q) => $q->where('assigned_to', $request->assigned_to))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->priority, fn($q) => $q->where('priority', $request->priority))
            ->when($request->due === 'today', fn($q) => $q->whereDate('due_date', now()->toDateString()))
            ->when($request->due === 'overdue', fn($q) => $q->whereDate('due_date', '<', now()->toDateString())->whereNotIn('status', ['completed', 'cancelled']))
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->orderBy('due_date')
            ->paginate(20);

        return $this->paginated($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $data['source'] = $data['source'] ?? 'manual';
        $task = Task::create($data);

        if ($task->assigned_to && ($assignee = Employee::find($task->assigned_to))) {
            $this->notifier->send($assignee, 'task.assigned',
                'New task assigned: ' . $task->title,
                'You have been assigned a new task. Due: ' . ($task->due_date?->format('Y-m-d') ?? 'no deadline'),
                '/tasks/' . $task->id,
                ['task_id' => $task->id]
            );
        }

        return $this->success($task->load(['assignee:id,name', 'project:id,name', 'checklist']), 'Task created', 201);
    }

    public function show(Task $task): JsonResponse
    {
        return $this->success(
            $task->load(['assignee:id,name,email', 'assigner:id,name', 'project:id,name,code',
                'checklist', 'attachments', 'comments.employee:id,name', 'approvals.approver:id,name', 'subTasks'])
        );
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $data = $this->validatePayload($request, $task->id);
        $oldStatus = $task->status;
        $task->update($data);

        if (isset($data['status']) && $data['status'] === 'completed' && $oldStatus !== 'completed') {
            $task->update(['completed_at' => now()]);
        }

        return $this->success($task->fresh()->load(['assignee:id,name', 'checklist']), 'Task updated');
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        return $this->success(null, 'Task deleted');
    }

    public function complete(Request $request, Task $task): JsonResponse
    {
        $task->update(['status' => 'review', 'completed_at' => now()]);

        if ($task->assigned_by && ($manager = Employee::find($task->assigned_by))) {
            $this->notifier->send($manager, 'task.review_requested',
                'Task ready for review: ' . $task->title,
                ($task->assignee?->name ?? 'Staff') . ' has completed the task and is awaiting your approval.',
                '/tasks/' . $task->id,
                ['task_id' => $task->id]
            );

            TaskApproval::create([
                'task_id'              => $task->id,
                'requested_by'         => $task->assigned_to,
                'approver_employee_id' => $task->assigned_by,
                'status'               => 'pending',
            ]);
        } else {
            $task->update(['status' => 'completed']);
        }

        return $this->success($task->fresh()->load('approvals'), 'Submitted for approval');
    }

    public function approve(Request $request, Task $task): JsonResponse
    {
        $approval = $task->approvals()->where('status', 'pending')->first();
        if ($approval) {
            $approval->update(['status' => 'approved', 'decided_at' => now(), 'remarks' => $request->input('remarks')]);
        }
        $task->update(['status' => 'completed']);

        if ($task->assigned_to && ($staff = Employee::find($task->assigned_to))) {
            $this->notifier->send($staff, 'task.approved',
                'Task approved: ' . $task->title, 'Well done! Your manager has approved the task.',
                '/tasks/' . $task->id, ['task_id' => $task->id]);
        }

        return $this->success($task->fresh(), 'Approved');
    }

    public function reject(Request $request, Task $task): JsonResponse
    {
        $approval = $task->approvals()->where('status', 'pending')->first();
        if ($approval) {
            $approval->update(['status' => 'rejected', 'decided_at' => now(), 'remarks' => $request->input('remarks')]);
        }
        $task->update(['status' => 'in_progress', 'completed_at' => null]);

        if ($task->assigned_to && ($staff = Employee::find($task->assigned_to))) {
            $this->notifier->send($staff, 'task.rejected',
                'Task rejected — please redo: ' . $task->title,
                'Manager remarks: ' . ($request->input('remarks') ?? '—'),
                '/tasks/' . $task->id, ['task_id' => $task->id]);
        }

        return $this->success($task->fresh(), 'Rejected');
    }

    public function uploadAttachment(Request $request, Task $task): JsonResponse
    {
        $request->validate([
            'file'    => 'required|file|max:10240',
            'caption' => 'nullable|string|max:255',
        ]);

        $stored = $request->file('file')->store('tasks/attachments', 'public');
        $att = TaskAttachment::create([
            'task_id'     => $task->id,
            'uploaded_by' => $request->input('uploaded_by'),
            'file_path'   => $stored,
            'file_type'   => $request->file('file')->getClientMimeType(),
            'size'        => $request->file('file')->getSize(),
            'caption'     => $request->input('caption'),
        ]);

        return $this->success($att, 'Attachment uploaded', 201);
    }

    public function toggleChecklistItem(Request $request, Task $task, TaskChecklistItem $item): JsonResponse
    {
        $item->update(['is_done' => !$item->is_done]);
        return $this->success($item, 'Checklist updated');
    }

    public function addChecklistItem(Request $request, Task $task): JsonResponse
    {
        $request->validate(['label' => 'required|string|max:255']);
        $item = TaskChecklistItem::create([
            'task_id' => $task->id,
            'label'   => $request->label,
            'order'   => $task->checklist()->count(),
        ]);
        return $this->success($item, 'Checklist item added', 201);
    }

    public function myTasks(Request $request): JsonResponse
    {
        $employeeId = $request->input('employee_id');
        if (!$employeeId) return $this->error('employee_id required', 422);

        $tasks = Task::with(['project:id,name', 'checklist'])
            ->where('assigned_to', $employeeId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'pending' THEN 2 WHEN 'review' THEN 3 ELSE 4 END")
            ->orderBy('due_date')
            ->paginate(50);

        return $this->paginated($tasks);
    }

    private function validatePayload(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'project_id'     => 'nullable|exists:projects,id',
            'parent_task_id' => 'nullable|exists:tasks,id',
            'assigned_to'    => 'nullable|exists:employees,id',
            'assigned_by'    => 'nullable|exists:employees,id',
            'title'          => $id ? 'sometimes|string|max:255' : 'required|string|max:255',
            'description'    => 'nullable|string',
            'priority'       => 'nullable|in:high,medium,low',
            'status'         => 'nullable|in:pending,in_progress,review,completed,cancelled',
            'due_date'       => 'nullable|date',
            'recurrence'     => 'nullable|in:none,daily,weekly,monthly',
            'source'         => 'nullable|in:manual,ai_generated,recurring',
            'source_jd_id'   => 'nullable|exists:hrm_job_descriptions,id',
        ]);
    }
}
