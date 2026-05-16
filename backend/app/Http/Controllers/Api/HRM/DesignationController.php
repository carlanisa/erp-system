<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Designation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $rows = Designation::query()
            ->with('department:id,code,name')
            ->withCount('employees')
            ->when($request->department_id, fn ($q) => $q->where('department_id', $request->department_id))
            ->when($request->search, fn ($q) => $q->where('title', 'like', "%{$request->search}%"))
            ->orderBy('title')
            ->get();

        return $this->success($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'department_id' => 'nullable|exists:hrm_departments,id',
            'title'         => 'required|string|max:120',
            'grade'         => 'nullable|string|max:30',
            'is_active'     => 'boolean',
        ]);

        $row = Designation::create($data);
        return $this->success($row->load('department:id,code,name'), 'Designation created', 201);
    }

    public function update(Request $request, Designation $designation): JsonResponse
    {
        $data = $request->validate([
            'department_id' => 'nullable|exists:hrm_departments,id',
            'title'         => 'sometimes|string|max:120',
            'grade'         => 'nullable|string|max:30',
            'is_active'     => 'boolean',
        ]);

        $designation->update($data);
        return $this->success($designation->load('department:id,code,name'));
    }

    public function destroy(Designation $designation): JsonResponse
    {
        if ($designation->employees()->exists()) {
            return $this->error('Cannot delete: designation has employees', 422);
        }
        $designation->delete();
        return $this->success(null, 'Designation deleted');
    }
}
