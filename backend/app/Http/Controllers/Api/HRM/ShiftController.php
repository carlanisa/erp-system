<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(
            Shift::withCount('employees')->orderBy('start_time')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'          => 'required|string|max:30|unique:hrm_shifts,code',
            'name'          => 'required|string|max:80',
            'start_time'    => 'required|date_format:H:i',
            'end_time'      => 'required|date_format:H:i',
            'break_minutes' => 'integer|min:0|max:300',
            'working_days'  => 'nullable|array',
            'working_days.*'=> 'string|in:mon,tue,wed,thu,fri,sat,sun',
            'is_active'     => 'boolean',
        ]);

        $row = Shift::create($data);
        return $this->success($row, 'Shift created', 201);
    }

    public function update(Request $request, Shift $shift): JsonResponse
    {
        $data = $request->validate([
            'code'          => 'sometimes|string|max:30|unique:hrm_shifts,code,' . $shift->id,
            'name'          => 'sometimes|string|max:80',
            'start_time'    => 'sometimes|date_format:H:i',
            'end_time'      => 'sometimes|date_format:H:i',
            'break_minutes' => 'integer|min:0|max:300',
            'working_days'  => 'nullable|array',
            'working_days.*'=> 'string|in:mon,tue,wed,thu,fri,sat,sun',
            'is_active'     => 'boolean',
        ]);

        $shift->update($data);
        return $this->success($shift);
    }

    public function destroy(Shift $shift): JsonResponse
    {
        if ($shift->employees()->exists()) {
            return $this->error('Cannot delete: shift assigned to employees', 422);
        }
        $shift->delete();
        return $this->success(null, 'Shift deleted');
    }
}
