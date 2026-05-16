<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\LeaveType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveTypeController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(LeaveType::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'          => 'required|string|max:20|unique:hrm_leave_types,code',
            'name'          => 'required|string|max:80',
            'days_per_year' => 'integer|min:0|max:365',
            'is_paid'       => 'boolean',
            'carry_forward' => 'boolean',
            'color'         => 'nullable|string|max:20',
            'is_active'     => 'boolean',
        ]);

        $row = LeaveType::create($data);
        return $this->success($row, 'Leave type created', 201);
    }

    public function update(Request $request, LeaveType $leaveType): JsonResponse
    {
        $data = $request->validate([
            'code'          => 'sometimes|string|max:20|unique:hrm_leave_types,code,' . $leaveType->id,
            'name'          => 'sometimes|string|max:80',
            'days_per_year' => 'integer|min:0|max:365',
            'is_paid'       => 'boolean',
            'carry_forward' => 'boolean',
            'color'         => 'nullable|string|max:20',
            'is_active'     => 'boolean',
        ]);

        $leaveType->update($data);
        return $this->success($leaveType);
    }

    public function destroy(LeaveType $leaveType): JsonResponse
    {
        $leaveType->delete();
        return $this->success(null, 'Leave type deleted');
    }
}
