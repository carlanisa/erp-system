<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Employee;
use App\Models\HRM\JobDescription;
use App\Models\Projects\Task;
use App\Services\AI\TaskGeneratorService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobDescriptionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private TaskGeneratorService $generator,
        private NotificationService $notifier
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $jds = JobDescription::query()
            ->with('designation:id,title')
            ->when($request->designation_id, fn($q) => $q->where('designation_id', $request->designation_id))
            ->orderByDesc('id')
            ->paginate(20);
        return $this->paginated($jds);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $jd = JobDescription::create($data);
        return $this->success($jd->load('designation:id,title'), 'Job description created', 201);
    }

    public function show(JobDescription $jobDescription): JsonResponse
    {
        return $this->success($jobDescription->load('designation:id,title'));
    }

    public function update(Request $request, JobDescription $jobDescription): JsonResponse
    {
        $data = $this->validatePayload($request, $jobDescription->id);
        $jobDescription->update($data);
        return $this->success($jobDescription->fresh(), 'Updated');
    }

    public function destroy(JobDescription $jobDescription): JsonResponse
    {
        $jobDescription->delete();
        return $this->success(null, 'Deleted');
    }

    /**
     * POST /api/hrm/job-descriptions/{jd}/generate-tasks
     * Calls Claude, returns proposed tasks (NOT saved yet — manager reviews).
     */
    public function generateTasks(JobDescription $jobDescription): JsonResponse
    {
        $result = $this->generator->generate($jobDescription);
        return $this->success([
            'tasks'    => $result['data'],
            'fallback' => !$result['ok'],
            'message'  => $result['message'],
        ], $result['message']);
    }

    /**
     * POST /api/hrm/job-descriptions/{jd}/assign
     * Body: { employee_id, tasks: [{title, description, priority, recurrence, due_offset_days}], manager_id? }
     * Saves the approved task list against the employee.
     */
    public function assignToEmployee(Request $request, JobDescription $jobDescription): JsonResponse
    {
        $data = $request->validate([
            'employee_id'                   => 'required|exists:employees,id',
            'manager_id'                    => 'nullable|exists:employees,id',
            'tasks'                         => 'required|array|min:1',
            'tasks.*.title'                 => 'required|string|max:255',
            'tasks.*.description'           => 'nullable|string',
            'tasks.*.priority'              => 'nullable|in:high,medium,low',
            'tasks.*.recurrence'            => 'nullable|in:none,daily,weekly,monthly',
            'tasks.*.due_offset_days'       => 'nullable|integer|min:0',
        ]);

        $employee = Employee::findOrFail($data['employee_id']);
        $start = $employee->join_date ?? now()->toDateString();
        $created = [];

        foreach ($data['tasks'] as $t) {
            $offset = (int) ($t['due_offset_days'] ?? 0);
            $created[] = Task::create([
                'assigned_to'  => $employee->id,
                'assigned_by'  => $data['manager_id'] ?? null,
                'title'        => $t['title'],
                'description'  => $t['description'] ?? null,
                'priority'     => $t['priority'] ?? 'medium',
                'recurrence'   => $t['recurrence'] ?? 'none',
                'due_date'     => date('Y-m-d', strtotime($start . ' +' . $offset . ' days')),
                'source'       => 'ai_generated',
                'source_jd_id' => $jobDescription->id,
                'status'       => 'pending',
            ]);
        }

        $this->notifier->send($employee, 'tasks.bulk_assigned',
            count($created) . ' new tasks assigned',
            'Starter tasks for your role are ready. Open the ERP to view them.',
            '/projects?tab=my-tasks',
            ['count' => count($created)]
        );

        return $this->success(['count' => count($created), 'tasks' => $created], 'Tasks assigned', 201);
    }

    private function validatePayload(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'designation_id'   => 'nullable|exists:hrm_designations,id',
            'title'            => $id ? 'sometimes|string|max:200' : 'required|string|max:200',
            'description'      => $id ? 'sometimes|string' : 'required|string',
            'responsibilities' => 'nullable|array',
            'kpis'             => 'nullable|array',
            'ai_generated'     => 'nullable|boolean',
            'is_active'        => 'nullable|boolean',
        ]);
    }
}
