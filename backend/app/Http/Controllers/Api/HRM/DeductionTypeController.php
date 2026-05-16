<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\DeductionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeductionTypeController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(DeductionType::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'            => 'required|string|max:30|unique:hrm_deduction_types,code',
            'name'            => 'required|string|max:120',
            'calc_type'       => 'in:fixed,percent,statutory',
            'default_amount'  => 'numeric|min:0',
            'default_percent' => 'numeric|min:0|max:100',
            'is_statutory'    => 'boolean',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'boolean',
        ]);
        $row = DeductionType::create($data);
        return $this->success($row, 'Deduction type created', 201);
    }

    public function update(Request $request, DeductionType $deductionType): JsonResponse
    {
        $data = $request->validate([
            'code'            => 'sometimes|string|max:30|unique:hrm_deduction_types,code,' . $deductionType->id,
            'name'            => 'sometimes|string|max:120',
            'calc_type'       => 'in:fixed,percent,statutory',
            'default_amount'  => 'numeric|min:0',
            'default_percent' => 'numeric|min:0|max:100',
            'is_statutory'    => 'boolean',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'boolean',
        ]);
        $deductionType->update($data);
        return $this->success($deductionType);
    }

    public function destroy(DeductionType $deductionType): JsonResponse
    {
        $deductionType->delete();
        return $this->success(null, 'Deduction type deleted');
    }
}
