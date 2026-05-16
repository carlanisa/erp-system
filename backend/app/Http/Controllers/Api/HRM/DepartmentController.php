<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $rows = Department::query()
            ->withCount(['employees', 'designations'])
            ->when($request->search, fn ($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('code', 'like', "%{$request->search}%"))
            ->orderBy('name')
            ->get();

        return $this->success($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'required|string|max:30|unique:hrm_departments,code',
            'name'      => 'required|string|max:120',
            'manager'   => 'nullable|string|max:120',
            'notes'     => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $dept = Department::create($data);
        return $this->success($dept, 'Department created', 201);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'sometimes|string|max:30|unique:hrm_departments,code,' . $department->id,
            'name'      => 'sometimes|string|max:120',
            'manager'   => 'nullable|string|max:120',
            'notes'     => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $department->update($data);
        return $this->success($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        if ($department->employees()->exists()) {
            return $this->error('Cannot delete: department has employees', 422);
        }
        $department->delete();
        return $this->success(null, 'Department deleted');
    }
}
