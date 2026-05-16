<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Attendance;
use App\Models\HRM\Employee;
use App\Models\HRM\Payroll;
use App\Models\HRM\PayrollLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PayrollController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $month = $request->integer('month', now()->month);
        $year  = $request->integer('year',  now()->year);

        $records = Payroll::with(['employee', 'lines'])
            ->where('month', $month)
            ->where('year', $year)
            ->orderBy('id')
            ->get();

        return $this->success($records);
    }

    public function show(Payroll $payroll): JsonResponse
    {
        return $this->success($payroll->load(['employee', 'lines']));
    }

    /**
     * Manual payroll entry — multi-line earnings + deductions.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'         => 'required|exists:employees,id',
            'month'               => 'required|integer|min:1|max:12',
            'year'                => 'required|integer|min:2020|max:2100',
            'basic_salary'        => 'required|numeric|min:0',
            'lines'               => 'array',
            'lines.*.line_type'   => 'required|in:earning,deduction',
            'lines.*.code'        => 'required|string|max:30',
            'lines.*.name'        => 'required|string|max:120',
            'lines.*.amount'      => 'required|numeric|min:0',
            'lines.*.allowance_type_id' => 'nullable|exists:hrm_allowance_types,id',
            'lines.*.deduction_type_id' => 'nullable|exists:hrm_deduction_types,id',
            'lines.*.calc_type'   => 'nullable|in:fixed,percent,statutory',
            'lines.*.is_taxable'  => 'sometimes|boolean',
            'lines.*.is_epf_eligible' => 'sometimes|boolean',
            'lines.*.is_statutory'    => 'sometimes|boolean',
        ]);

        if (Payroll::where('employee_id', $data['employee_id'])
            ->where('month', $data['month'])->where('year', $data['year'])->exists()) {
            return $this->error('Payroll already exists for this employee in the selected month', 422);
        }

        $lines = $data['lines'] ?? [];
        $earnSum   = collect($lines)->where('line_type', 'earning')->sum('amount');
        $deductSum = collect($lines)->where('line_type', 'deduction')->sum('amount');
        $net = max(0, (float) $data['basic_salary'] + (float) $earnSum - (float) $deductSum);

        $payroll = DB::transaction(function () use ($data, $earnSum, $deductSum, $net, $lines) {
            $p = Payroll::create([
                'employee_id'  => $data['employee_id'],
                'month'        => $data['month'],
                'year'         => $data['year'],
                'basic_salary' => $data['basic_salary'],
                'allowances'   => $earnSum,
                'deductions'   => $deductSum,
                'net_salary'   => $net,
                'status'       => 'draft',
            ]);

            foreach ($lines as $i => $ln) {
                PayrollLine::create([
                    'payroll_id'         => $p->id,
                    'line_type'          => $ln['line_type'],
                    'allowance_type_id'  => $ln['allowance_type_id'] ?? null,
                    'deduction_type_id'  => $ln['deduction_type_id'] ?? null,
                    'code'               => $ln['code'],
                    'name'               => $ln['name'],
                    'amount'             => $ln['amount'],
                    'calc_type'          => $ln['calc_type'] ?? 'fixed',
                    'is_taxable'         => $ln['is_taxable']      ?? true,
                    'is_epf_eligible'    => $ln['is_epf_eligible'] ?? false,
                    'is_statutory'       => $ln['is_statutory']    ?? false,
                    'sort_order'         => $i,
                ]);
            }
            return $p;
        });

        return $this->success($payroll->load(['employee', 'lines']), 'Payroll entry created', 201);
    }

    /**
     * Edit a draft payroll (lines fully replaced if provided).
     */
    public function update(Request $request, Payroll $payroll): JsonResponse
    {
        if ($payroll->status === 'paid') {
            return $this->error('Cannot edit a paid payroll record', 422);
        }

        $data = $request->validate([
            'basic_salary' => 'sometimes|numeric|min:0',
            'lines'        => 'sometimes|array',
            'lines.*.line_type' => 'required_with:lines|in:earning,deduction',
            'lines.*.code'      => 'required_with:lines|string|max:30',
            'lines.*.name'      => 'required_with:lines|string|max:120',
            'lines.*.amount'    => 'required_with:lines|numeric|min:0',
            'lines.*.allowance_type_id' => 'nullable|exists:hrm_allowance_types,id',
            'lines.*.deduction_type_id' => 'nullable|exists:hrm_deduction_types,id',
            'lines.*.calc_type' => 'nullable|in:fixed,percent,statutory',
            'lines.*.is_taxable'      => 'sometimes|boolean',
            'lines.*.is_epf_eligible' => 'sometimes|boolean',
            'lines.*.is_statutory'    => 'sometimes|boolean',
        ]);

        DB::transaction(function () use ($data, $payroll) {
            $basic = (float) ($data['basic_salary'] ?? $payroll->basic_salary);

            if (array_key_exists('lines', $data)) {
                $payroll->lines()->delete();
                foreach ($data['lines'] as $i => $ln) {
                    PayrollLine::create([
                        'payroll_id'         => $payroll->id,
                        'line_type'          => $ln['line_type'],
                        'allowance_type_id'  => $ln['allowance_type_id'] ?? null,
                        'deduction_type_id'  => $ln['deduction_type_id'] ?? null,
                        'code'               => $ln['code'],
                        'name'               => $ln['name'],
                        'amount'             => $ln['amount'],
                        'calc_type'          => $ln['calc_type'] ?? 'fixed',
                        'is_taxable'         => $ln['is_taxable']      ?? true,
                        'is_epf_eligible'    => $ln['is_epf_eligible'] ?? false,
                        'is_statutory'       => $ln['is_statutory']    ?? false,
                        'sort_order'         => $i,
                    ]);
                }
            }

            $earnSum   = (float) $payroll->lines()->where('line_type', 'earning')->sum('amount');
            $deductSum = (float) $payroll->lines()->where('line_type', 'deduction')->sum('amount');

            $payroll->update([
                'basic_salary' => $basic,
                'allowances'   => $earnSum,
                'deductions'   => $deductSum,
                'net_salary'   => max(0, $basic + $earnSum - $deductSum),
            ]);
        });

        return $this->success($payroll->fresh(['employee', 'lines']), 'Payroll updated');
    }

    public function destroy(Payroll $payroll): JsonResponse
    {
        if ($payroll->status === 'paid') {
            return $this->error('Cannot delete a paid payroll record', 422);
        }
        $payroll->delete();
        return $this->success(null, 'Payroll deleted');
    }

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year'  => 'required|integer|min:2020|max:2100',
        ]);

        $month = $request->integer('month');
        $year  = $request->integer('year');

        $employees = Employee::where('status', 'active')->get();

        if ($employees->isEmpty()) {
            return $this->error('No active employees found', 422);
        }

        $created = 0;

        DB::transaction(function () use ($employees, $month, $year, &$created) {
            foreach ($employees as $emp) {
                if (Payroll::where('employee_id', $emp->id)
                    ->where('month', $month)->where('year', $year)->exists()) {
                    continue;
                }

                $daysInMonth   = cal_days_in_month(CAL_GREGORIAN, $month, $year);
                $absentDays = Attendance::where('employee_id', $emp->id)
                    ->whereYear('date', $year)->whereMonth('date', $month)
                    ->where('status', 'absent')->count();

                $allowances = round($emp->basic_salary * 0.10, 2);
                $dailyRate  = $emp->basic_salary / $daysInMonth;
                $deductions = round($absentDays * $dailyRate, 2);

                $payroll = Payroll::create([
                    'employee_id'  => $emp->id,
                    'month'        => $month,
                    'year'         => $year,
                    'basic_salary' => $emp->basic_salary,
                    'allowances'   => $allowances,
                    'deductions'   => $deductions,
                    'net_salary'   => max(0, $emp->basic_salary + $allowances - $deductions),
                    'status'       => 'draft',
                ]);

                // Default lines for visual breakdown
                if ($allowances > 0) {
                    PayrollLine::create([
                        'payroll_id' => $payroll->id, 'line_type' => 'earning',
                        'code' => 'HRA', 'name' => 'House Rent Allowance', 'amount' => $allowances,
                        'calc_type' => 'percent', 'is_taxable' => true, 'is_epf_eligible' => true,
                        'sort_order' => 0,
                    ]);
                }
                if ($deductions > 0) {
                    PayrollLine::create([
                        'payroll_id' => $payroll->id, 'line_type' => 'deduction',
                        'code' => 'ABSENT', 'name' => "Absent days ({$absentDays})", 'amount' => $deductions,
                        'calc_type' => 'fixed', 'sort_order' => 0,
                    ]);
                }
                $created++;
            }
        });

        return $this->success(
            ['generated' => $created],
            $created > 0
                ? "Payroll generated for {$created} employee(s)"
                : 'Payroll already generated for all employees this month'
        );
    }

    public function markPaid(Payroll $payroll): JsonResponse
    {
        if ($payroll->status === 'paid') {
            return $this->error('Payroll already marked as paid', 422);
        }

        $payroll->update([
            'status'    => 'paid',
            'paid_date' => now()->toDateString(),
        ]);

        return $this->success($payroll->load('employee'), 'Payroll marked as paid');
    }

    public function pdf(Payroll $payroll, \App\Services\PdfRenderer $renderer)
    {
        $payroll->load('employee');
        $monthName = \DateTime::createFromFormat('!m', (string) $payroll->month)->format('M');
        $filename  = sprintf(
            'Payslip-%s-%s-%d.pdf',
            $payroll->employee->employee_code,
            $monthName,
            $payroll->year,
        );
        return $renderer->payslip($payroll)->stream($filename);
    }

    /**
     * Email a payslip PDF to a single employee.
     */
    public function email(Payroll $payroll, \App\Services\PdfRenderer $renderer): JsonResponse
    {
        $payroll->load('employee');
        $emp = $payroll->employee;
        if (!$emp?->email) {
            return $this->error('No email on file for this employee', 422);
        }

        return $this->success($this->sendOneEmail($payroll, $renderer));
    }

    /**
     * Bulk email — send pay slips to all employees with email
     * for the given month + year.
     */
    public function emailBulk(Request $request, \App\Services\PdfRenderer $renderer): JsonResponse
    {
        $data = $request->validate([
            'month'        => 'required|integer|min:1|max:12',
            'year'         => 'required|integer|min:2020|max:2100',
            'only_unsent'  => 'sometimes|boolean',
        ]);

        $q = Payroll::with('employee')
            ->where('month', $data['month'])->where('year', $data['year']);
        if ($data['only_unsent'] ?? true) {
            $q->whereNull('email_sent_at');
        }

        $records = $q->get();
        $results = ['sent' => 0, 'skipped_no_email' => 0, 'failed' => 0];

        foreach ($records as $p) {
            if (!$p->employee?->email) { $results['skipped_no_email']++; continue; }
            $r = $this->sendOneEmail($p, $renderer);
            if ($r['ok']) $results['sent']++; else $results['failed']++;
        }

        return $this->success($results, "Sent {$results['sent']} payslip email(s)");
    }

    private function sendOneEmail(Payroll $payroll, \App\Services\PdfRenderer $renderer): array
    {
        $emp = $payroll->employee;
        $monthName = \DateTime::createFromFormat('!m', (string) $payroll->month)->format('F');
        $period    = "$monthName {$payroll->year}";

        try {
            $pdfData = $renderer->payslip($payroll)->output();
            $filename = "Payslip-{$emp->employee_code}-{$payroll->month}-{$payroll->year}.pdf";

            Mail::send('emails.payslip', [
                'payroll' => $payroll,
                'period'  => $period,
            ], function (Message $m) use ($emp, $period, $pdfData, $filename) {
                $m->to($emp->email, $emp->name)
                  ->subject("[ERP] Your Payslip — {$period}")
                  ->attachData($pdfData, $filename, ['mime' => 'application/pdf']);
            });

            $payroll->update([
                'email_sent_at' => now(),
                'email_sent_to' => $emp->email,
                'email_status'  => 'sent',
            ]);
            return ['ok' => true, 'to' => $emp->email];
        } catch (\Throwable $e) {
            Log::error('Payslip email failed', ['err' => $e->getMessage(), 'payroll_id' => $payroll->id]);
            $payroll->update(['email_status' => 'failed']);
            return ['ok' => false, 'err' => $e->getMessage()];
        }
    }
}
