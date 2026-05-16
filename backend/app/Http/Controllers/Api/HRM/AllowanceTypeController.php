<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\AllowanceType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AllowanceTypeController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(AllowanceType::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'            => 'required|string|max:30|unique:hrm_allowance_types,code',
            'name'            => 'required|string|max:120',
            'calc_type'       => 'in:fixed,percent',
            'default_amount'  => 'numeric|min:0',
            'default_percent' => 'numeric|min:0|max:100',
            'is_taxable'      => 'boolean',
            'is_epf_eligible' => 'boolean',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'boolean',
        ]);
        $row = AllowanceType::create($data);
        return $this->success($row, 'Allowance type created', 201);
    }

    public function update(Request $request, AllowanceType $allowanceType): JsonResponse
    {
        $data = $request->validate([
            'code'            => 'sometimes|string|max:30|unique:hrm_allowance_types,code,' . $allowanceType->id,
            'name'            => 'sometimes|string|max:120',
            'calc_type'       => 'in:fixed,percent',
            'default_amount'  => 'numeric|min:0',
            'default_percent' => 'numeric|min:0|max:100',
            'is_taxable'      => 'boolean',
            'is_epf_eligible' => 'boolean',
            'color'           => 'nullable|string|max:20',
            'is_active'       => 'boolean',
        ]);
        $allowanceType->update($data);
        return $this->success($allowanceType);
    }

    public function destroy(AllowanceType $allowanceType): JsonResponse
    {
        $allowanceType->delete();
        return $this->success(null, 'Allowance type deleted');
    }
}
