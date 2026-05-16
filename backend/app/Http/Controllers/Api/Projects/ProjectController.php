<?php

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Projects\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $projects = Project::query()
            ->with('owner:id,name,employee_code')
            ->withCount(['tasks', 'tasks as completed_tasks_count' => fn($q) => $q->where('status', 'completed')])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, fn($q) => $q->where(function ($w) use ($request) {
                $w->where('name', 'like', "%{$request->search}%")
                  ->orWhere('code', 'like', "%{$request->search}%");
            }))
            ->orderByDesc('id')
            ->paginate(20);

        return $this->paginated($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $data['code'] = $data['code'] ?? $this->generateCode();
        $project = Project::create($data);
        return $this->success($project->load('owner:id,name'), 'Project created', 201);
    }

    public function show(Project $project): JsonResponse
    {
        return $this->success($project->load(['owner:id,name', 'tasks.assignee:id,name']));
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $data = $this->validatePayload($request, $project->id);
        $project->update($data);
        return $this->success($project->load('owner:id,name'), 'Project updated');
    }

    public function destroy(Project $project): JsonResponse
    {
        $project->delete();
        return $this->success(null, 'Project deleted');
    }

    private function validatePayload(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'code'              => 'nullable|string|max:50',
            'name'              => $id ? 'sometimes|string|max:200' : 'required|string|max:200',
            'description'       => 'nullable|string',
            'owner_employee_id' => 'nullable|exists:employees,id',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date|after_or_equal:start_date',
            'status'            => 'nullable|in:planning,active,on_hold,completed,cancelled',
            'priority'          => 'nullable|in:high,medium,low',
        ]);
    }

    private function generateCode(): string
    {
        $last = Project::orderByDesc('id')->first();
        $next = $last ? $last->id + 1 : 1;
        return 'PRJ' . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
