@php
  $emp     = $leave->employee;
  $type    = $leave->leaveType?->name ?: ucfirst($leave->type ?? 'leave');
  $from    = $leave->from_date->format('d M Y');
  $to      = $leave->to_date->format('d M Y');
  $isApproved = $leave->status === 'approved';
@endphp
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Leave {{ $isApproved ? 'Approved' : 'Rejected' }} — {{ $emp->name }}</title>
@include('emails._leave-styles')
</head>
<body>
<div class="wrap">

  <div class="top-bar"></div>

  <div class="erp-badge">
    <div class="crumbs">CARLANISA <span class="accent">·</span> ERP SYSTEM <span class="accent">·</span> DECISION NOTICE</div>
    <div class="auto-line">
      Hi <b>{{ $emp->name }}</b>, HR has reviewed the
      <b>Leave Application Form</b> you submitted on {{ $leave->created_at->format('d M Y') }}.
    </div>
  </div>

  <h1 class="title">{{ $isApproved ? '✅ Leave Approved' : '❌ Leave Request Declined' }}</h1>
  <div class="subtitle">Reference #LR-{{ str_pad((string) $leave->id, 5, '0', STR_PAD_LEFT) }} · Decided {{ optional($leave->approved_at)->format('d M Y, h:i A') ?? now()->format('d M Y, h:i A') }}</div>

  <div class="body">

    <div>
      <span class="pill {{ $isApproved ? 'pill-approved' : 'pill-rejected' }}">
        {{ $isApproved ? 'Approved' : 'Rejected' }}
      </span>
    </div>

    <div class="form-card">
      <div class="form-card-h {{ $isApproved ? '' : 'alt' }}">Decision Summary</div>
      <table class="form-grid">
        <tr><td class="lbl">Employee</td>           <td class="val">{{ $emp->name }} ({{ $emp->employee_code }})</td></tr>
        <tr><td class="lbl">Leave Type</td>         <td class="val">{{ $type }}</td></tr>
        <tr><td class="lbl">Period</td>             <td class="val">{{ $from }} → {{ $to }} ({{ $leave->days }} day{{ $leave->days != 1 ? 's' : '' }})</td></tr>
        <tr><td class="lbl">Decision</td>           <td class="val">{{ $isApproved ? 'APPROVED' : 'REJECTED' }}</td></tr>
      </table>
      @if ($leave->admin_notes)
        <div class="reason-box">
          <span class="h">{{ $isApproved ? 'Note from HR' : 'Reason for Rejection' }}</span>
          {{ $leave->admin_notes }}
        </div>
      @endif
    </div>

    @if ($isApproved)
      <p style="font-size: 13px; color: #5a4d3b; line-height: 1.6; margin-top: 18px;">
        Enjoy your time off! Please coordinate the handover with your team
        before you leave so things run smoothly during your absence.
      </p>
    @else
      <p style="font-size: 13px; color: #5a4d3b; line-height: 1.6; margin-top: 18px;">
        We're sorry your leave couldn't be approved this time. Please reach out
        to HR if you'd like to discuss alternatives or re-submit on different dates.
      </p>
    @endif

  </div>

  <div class="footer">
    This is an <b>automated decision notice</b> from the <span class="accent">Carlanisa ERP System</span>.
    For questions, contact <b>hr@carlanisa.com</b>.
  </div>

</div>
</body>
</html>
