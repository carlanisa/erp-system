<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\InstallmentPlan;
use App\Models\CRM\InstallmentSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InstallmentController extends Controller
{
    use ApiResponse;

    public function index(Request $r): JsonResponse
    {
        $q = InstallmentPlan::with(['customer','invoice','schedules'])
            ->when($r->search, fn($qq) => $qq->where(fn($w) =>
                $w->where('plan_no','like',"%{$r->search}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name','like',"%{$r->search}%"))))
            ->when($r->status, fn($qq) => $qq->where('status', $r->status))
            ->orderByDesc('id');

        return $this->paginated($q->paginate((int) ($r->per_page ?? 15)));
    }

    public function show(InstallmentPlan $installment): JsonResponse
    {
        return $this->success($installment->load(['customer','invoice','schedules']));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $this->validateData($r);
        $data['plan_no'] = $this->nextNo();
        return DB::transaction(function () use ($data) {
            $schedules = $data['schedules'] ?? [];
            unset($data['schedules']);
            $plan = InstallmentPlan::create($data);
            foreach ($schedules as $idx => $s) {
                InstallmentSchedule::create([
                    'plan_id' => $plan->id,
                    'no' => $s['no'] ?? ($idx + 1),
                    'due_date' => $s['due_date'],
                    'amount' => (float) $s['amount'],
                    'status' => $s['status'] ?? 'pending',
                ]);
            }
            return $this->success($plan->load(['schedules','customer']), 'Created', 201);
        });
    }

    public function update(Request $r, InstallmentPlan $installment): JsonResponse
    {
        $data = $this->validateData($r, true);
        return DB::transaction(function () use ($data, $installment) {
            $schedules = $data['schedules'] ?? null;
            unset($data['schedules']);
            $installment->update($data);
            if ($schedules !== null) {
                $installment->schedules()->whereNotIn('status', ['paid'])->delete();
                foreach ($schedules as $idx => $s) {
                    if (!empty($s['id'])) continue;
                    InstallmentSchedule::create([
                        'plan_id' => $installment->id,
                        'no' => $s['no'] ?? ($idx + 1),
                        'due_date' => $s['due_date'],
                        'amount' => (float) $s['amount'],
                        'status' => $s['status'] ?? 'pending',
                    ]);
                }
            }
            return $this->success($installment->load('schedules'), 'Updated');
        });
    }

    public function destroy(InstallmentPlan $installment): JsonResponse
    {
        $installment->delete();
        return $this->success(null, 'Deleted');
    }

    public function pay(Request $r, InstallmentPlan $installment, InstallmentSchedule $schedule): JsonResponse
    {
        if ($schedule->plan_id !== $installment->id) {
            return $this->error('Schedule does not belong to this plan', 422);
        }
        $data = $r->validate([
            'amount' => 'required|numeric|min:0',
            'date' => 'nullable|date',
            'reference' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data, $installment, $schedule) {
            $newPaid = (float) $schedule->paid_amount + (float) $data['amount'];
            $schedule->update([
                'paid_amount' => $newPaid,
                'paid_date'   => $data['date'] ?? now()->toDateString(),
                'reference'   => $data['reference'] ?? null,
                'status'      => $newPaid >= (float) $schedule->amount ? 'paid' : 'pending',
            ]);

            $installment->update([
                'paid_amount' => (float) $installment->schedules()->sum('paid_amount'),
            ]);
            // mark plan completed if all paid
            if ($installment->schedules()->where('status','!=','paid')->count() === 0) {
                $installment->update(['status' => 'completed']);
            }
            return $this->success($installment->load('schedules'), 'Payment recorded');
        });
    }

    private function validateData(Request $r, bool $partial = false): array
    {
        return $r->validate([
            'invoice_id' => 'nullable|exists:crm_invoices,id',
            'customer_id' => ($partial ? 'nullable' : 'required').'|exists:customers,id',
            'start_date' => ($partial ? 'sometimes' : 'required').'|date',
            'total_amount' => ($partial ? 'sometimes' : 'required').'|numeric|min:0',
            'installments_count' => 'nullable|integer|min:1',
            'frequency' => 'nullable|in:weekly,biweekly,monthly',
            'status' => 'nullable|in:active,completed,defaulted,cancelled',
            'notes' => 'nullable|string',
            'schedules' => 'nullable|array',
            'schedules.*.no' => 'nullable|integer',
            'schedules.*.due_date' => 'required_with:schedules|date',
            'schedules.*.amount' => 'required_with:schedules|numeric|min:0',
        ]);
    }

    private function nextNo(): string
    {
        $yr = date('Y');
        $last = InstallmentPlan::whereYear('created_at', $yr)->orderByDesc('id')->first();
        $n = $last ? ((int) substr($last->plan_no, -5)) + 1 : 1;
        return 'IP-'.$yr.'-'.str_pad($n, 5, '0', STR_PAD_LEFT);
    }
}
