@php
  $emp        = $payroll->employee;
  $monthName  = \DateTime::createFromFormat('!m', (string) $payroll->month)->format('F');
  $period     = "$monthName {$payroll->year}";
  $statusKey  = $payroll->status === 'paid' ? 'paid' : 'unpaid';
  $statusLabel= $payroll->status === 'paid' ? 'Paid'  : 'Pending';
  $paidDate   = $payroll->paid_date ? \Illuminate\Support\Carbon::parse($payroll->paid_date)->format('d M Y') : '—';
  $joinDate   = $emp->join_date ? \Illuminate\Support\Carbon::parse($emp->join_date)->format('d M Y') : '—';

  $basic       = (float) $payroll->basic_salary;
  $totalEarn   = $basic + (float) $payroll->allowances;
  $totalDeduct = (float) $payroll->deductions;
  $net         = (float) $payroll->net_salary;

  // Multi-line breakdown (preferred) — fall back to flat statutory if no lines
  $lines       = $payroll->relationLoaded('lines') ? $payroll->lines : ($payroll->lines ?? collect());
  $earnLines   = $lines->where('line_type', 'earning')->values();
  $deductLines = $lines->where('line_type', 'deduction')->values();

  // Combined ordered list for the table
  $allLines = collect()
    ->push((object)[
      'line_type' => 'basic',
      'code'      => 'BASIC',
      'name'      => 'Basic Salary',
      'amount'    => $basic,
    ])
    ->concat($earnLines->map(fn ($l) => (object)[
      'line_type' => 'earning', 'code' => $l->code, 'name' => $l->name, 'amount' => (float) $l->amount,
    ]))
    ->concat($deductLines->map(fn ($l) => (object)[
      'line_type' => 'deduction', 'code' => $l->code, 'name' => $l->name, 'amount' => (float) $l->amount,
    ]));

  // Employer contributions (computed)
  $emp_epf   = $breakdown['emp_epf']   ?? round($basic * ($basic <= 5000 ? 0.13 : 0.12), 2);
  $emp_socso = $breakdown['emp_socso'] ?? round($basic * 0.0175, 2);
  $emp_eis   = $breakdown['emp_eis']   ?? round($basic * 0.002, 2);

  $idLabel = $emp->ic_type === 'passport' ? 'Passport No.' : 'IC No.';
  $idValue = $emp->ic_passport_no ?: ($emp->cnic ?: '—');
@endphp

@extends('pdf._layout')

@section('title', 'Payslip — ' . $emp->name . ' — ' . $period)
@section('doc-title', 'Payslip')
@section('doc-sub', 'Salary Statement · ' . strtoupper($period))
@section('doc-num-label', 'Pay Period')
@section('doc-num-value', strtoupper($period))
@section('status-pill')
  <span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span>
@endsection

@section('meta-left-title', 'Employee')
@section('meta-left')
  <div class="meta-row"><span class="lbl">Name</span><span class="val">{{ strtoupper($emp->name) }}</span></div>
  <div class="meta-row"><span class="lbl">Employee No.</span><span class="val">{{ $emp->employee_code }}</span></div>
  <div class="meta-row"><span class="lbl">Department</span><span class="val">{{ strtoupper($emp->department ?: '—') }}</span></div>
  <div class="meta-row"><span class="lbl">Designation</span><span class="val">{{ $emp->designation ?: '—' }}</span></div>
  <div class="meta-row"><span class="lbl">{{ $idLabel }}</span><span class="val">{{ $idValue }}</span></div>
  <div class="meta-row"><span class="lbl">EPF No.</span><span class="val">{{ $emp->epf_no ?: '—' }}</span></div>
@endsection

@section('meta-right-title', 'Pay Details')
@section('meta-right')
  <div class="meta-row"><span class="lbl">Pay Period</span><span class="val">{{ strtoupper($period) }}</span></div>
  <div class="meta-row"><span class="lbl">Bank Name</span><span class="val">{{ strtoupper($emp->bank_name ?: '—') }}</span></div>
  <div class="meta-row"><span class="lbl">A/C Holder</span><span class="val">{{ strtoupper($emp->bank_account_name ?: $emp->name) }}</span></div>
  <div class="meta-row"><span class="lbl">A/C No.</span><span class="val">{{ $emp->bank_account_no ?: '—' }}</span></div>
  <div class="meta-row"><span class="lbl">Join Date</span><span class="val">{{ $joinDate }}</span></div>
  <div class="meta-row"><span class="lbl">Paid Date</span><span class="val">{{ $paidDate }}</span></div>
@endsection

@section('line-headers')
  <th style="width: 6%;">#</th>
  <th style="width: 18%;">Code</th>
  <th style="width: 50%;">Description</th>
  <th style="width: 14%;">Type</th>
  <th class="amt" style="width: 12%;">Amount (RM)</th>
@endsection

@section('line-rows')
  @foreach ($allLines as $i => $ln)
    @php
      $typeLabel = match ($ln->line_type) {
        'basic'     => 'Earning',
        'earning'   => 'Earning',
        'deduction' => 'Deduction',
      };
      $typeColor = $ln->line_type === 'deduction' ? '#991b1b' : '#166534';
      $sign      = $ln->line_type === 'deduction' ? '-' : '';
    @endphp
    <tr>
      <td style="color:#94a3b8;">{{ $i + 1 }}</td>
      <td><span class="acct-code">{{ $ln->code }}</span></td>
      <td><span class="desc-main">{{ $ln->name }}</span></td>
      <td style="color: {{ $typeColor }}; font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px;">{{ $typeLabel }}</td>
      <td class="amt" style="color: {{ $typeColor }};">{{ $sign }}{{ number_format((float) $ln->amount, 2) }}</td>
    </tr>
  @endforeach
@endsection

@section('col-count', 5)
@section('filler-h', '120px')

@section('totals-rows')
  <tr><td class="lbl">Gross Earnings</td><td class="val">{{ number_format($totalEarn, 2) }}</td></tr>
  <tr><td class="lbl">Total Deductions</td><td class="val" style="color:#991b1b;">- {{ number_format($totalDeduct, 2) }}</td></tr>
  <tr><td class="lbl">Employer EPF</td><td class="val" style="color:#64748b;">{{ number_format($emp_epf, 2) }}</td></tr>
  <tr><td class="lbl">Employer SOCSO</td><td class="val" style="color:#64748b;">{{ number_format($emp_socso, 2) }}</td></tr>
  <tr><td class="lbl">Employer EIS</td><td class="val" style="color:#64748b;">{{ number_format($emp_eis, 2) }}</td></tr>
@endsection

@section('grand-label', 'Net Pay (RM)')
@section('total-amount', number_format($net, 2))

@section('sig-left', 'Prepared By')
@section('sig-left-name', 'HR / Payroll Officer')
@section('sig-right', 'Received By')
@section('sig-right-name', strtoupper($emp->name))

@section('notes')
  <b>Note:</b> This payslip shows your earnings, statutory deductions, and the employer's EPF/SOCSO/EIS contributions for {{ strtoupper($period) }}.
  Please retain it for your records. For any queries, contact <b>hr@carlanisa.com</b>.
@endsection
