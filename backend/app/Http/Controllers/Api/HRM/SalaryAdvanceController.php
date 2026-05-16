<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\SalaryAdvance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryAdvanceController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $rows = SalaryAdvance::query()
            ->with('employee:id,employee_code,name,department,department_id')
            ->when($request->employee_id, fn ($q) => $q->where('employee_id', $request->employee_id))
            ->when($request->status,      fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('advance_date')
            ->orderByDesc('id')
            ->get();

        return $this->success($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'  => 'required|exists:employees,id',
            'advance_date' => 'required|date',
            'amount'       => 'required|numeric|min:0.01',
            'installments' => 'required|integer|min:1|max:36',
            'reason'       => 'nullable|string|max:200',
            'notes'        => 'nullable|string',
        ]);

        $data['monthly_deduction'] = round($data['amount'] / $data['installments'], 2);
        $data['status']            = 'active';
        $data['paid_amount']       = 0;
        $data['approved_by']       = $request->user()?->id;
        $data['approved_at']       = now();

        $row = SalaryAdvance::create($data);
        return $this->success($row->load('employee:id,employee_code,name,department'), 'Salary advance issued', 201);
    }

    public function update(Request $request, SalaryAdvance $salaryAdvance): JsonResponse
    {
        $data = $request->validate([
            'advance_date'      => 'sometimes|date',
            'amount'            => 'sometimes|numeric|min:0.01',
            'installments'      => 'sometimes|integer|min:1|max:36',
            'monthly_deduction' => 'sometimes|numeric|min:0',
            'paid_amount'       => 'sometimes|numeric|min:0',
            'status'            => 'sometimes|in:active,settled,cancelled',
            'reason'            => 'nullable|string|max:200',
            'notes'             => 'nullable|string',
        ]);

        if (isset($data['amount']) || isset($data['installments'])) {
            $amount       = $data['amount']       ?? $salaryAdvance->amount;
            $installments = $data['installments'] ?? $salaryAdvance->installments;
            $data['monthly_deduction'] = round($amount / max(1, $installments), 2);
        }

        if (isset($data['paid_amount']) && $data['paid_amount'] >= ($data['amount'] ?? $salaryAdvance->amount)) {
            $data['status'] = 'settled';
        }

        $salaryAdvance->update($data);
        return $this->success($salaryAdvance->load('employee:id,employee_code,name,department'));
    }

    public function destroy(SalaryAdvance $salaryAdvance): JsonResponse
    {
        if ($salaryAdvance->paid_amount > 0) {
            return $this->error('Cannot delete: already partially paid. Cancel instead.', 422);
        }
        $salaryAdvance->delete();
        return $this->success(null, 'Advance deleted');
    }

    public function summary(): JsonResponse
    {
        $active = SalaryAdvance::where('status', 'active');
        return $this->success([
            'active_count'      => (int) (clone $active)->count(),
            'total_outstanding' => (float) ((clone $active)->sum('amount') - (clone $active)->sum('paid_amount')),
            'monthly_recovery'  => (float) (clone $active)->sum('monthly_deduction'),
            'settled_this_year' => (int) SalaryAdvance::where('status', 'settled')
                ->whereYear('updated_at', now()->year)->count(),
        ]);
    }
}
