@php
  $emp = $payroll->employee;
@endphp
<!doctype html>
<html><head><meta charset="utf-8">
@include('emails._leave-styles')
</head>
<body>
<div class="wrap">
  <div class="top-bar"></div>

  <div class="erp-badge">
    <div class="crumbs">CARLANISA <span class="accent">·</span> ERP SYSTEM <span class="accent">·</span> PAYSLIP</div>
    <div class="auto-line">Hi <b>{{ $emp->name }}</b>, your payslip for <b>{{ $period }}</b> is attached as a PDF.</div>
  </div>

  <h1 class="title">💼 Payslip — {{ $period }}</h1>
  <div class="subtitle">{{ $emp->employee_code }} · {{ $emp->department ?? '—' }}</div>

  <div class="body">
    <div class="form-card">
      <div class="form-card-h">Quick Summary</div>
      <table class="form-grid">
        <tr><td class="lbl">Basic Salary</td>   <td class="val">RM {{ number_format($payroll->basic_salary, 2) }}</td></tr>
        <tr><td class="lbl">Total Earnings</td> <td class="val">+ RM {{ number_format($payroll->allowances, 2) }}</td></tr>
        <tr><td class="lbl">Total Deductions</td><td class="val">- RM {{ number_format($payroll->deductions, 2) }}</td></tr>
        <tr><td class="lbl" style="color:#b3573a;font-size:13px;">Net Pay</td>
            <td class="val" style="color:#b3573a;font-size:15px;">RM {{ number_format($payroll->net_salary, 2) }}</td></tr>
        <tr><td class="lbl">Status</td>
            <td class="val">{{ $payroll->status === 'paid' ? 'Paid on ' . optional($payroll->paid_date)->format('d M Y') : 'Pending payment' }}</td></tr>
      </table>
    </div>

    <p style="font-size:13px;color:#5a4d3b;line-height:1.6;margin-top:18px;">
      The attached PDF contains your full payslip with the EPF / SOCSO / EIS / PCB breakdown
      and employer contributions. Please retain it for your records.
    </p>
    <p style="font-size:13px;color:#5a4d3b;line-height:1.6;">
      For any questions about this payslip, reply to this email or contact <b>hr@carlanisa.com</b>.
    </p>
  </div>

  <div class="footer">
    Automated payslip from the <span class="accent">Carlanisa ERP System</span>. Confidential —
    please do not forward.
  </div>
</div>
</body></html>
