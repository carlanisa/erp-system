@php
  $emp     = $leave->employee;
  $type    = $leave->leaveType?->name ?: ucfirst($leave->type ?? 'leave');
  $from    = $leave->from_date->format('d M Y');
  $to      = $leave->to_date->format('d M Y');
@endphp
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Leave Request Received — {{ $emp->name }}</title>
@include('emails._leave-styles')
</head>
<body>
<div class="wrap">

  <div class="top-bar"></div>

  <div class="erp-badge">
    <div class="crumbs">CARLANISA <span class="accent">·</span> ERP SYSTEM <span class="accent">·</span> CONFIRMATION</div>
    <div class="auto-line">
      Hi <b>{{ $emp->name }}</b>, this is your auto-generated copy of the
      <b>Leave Application Form</b> you just submitted. The ERP System has forwarded it to HR.
    </div>
  </div>

  <h1 class="title">✅ Your Leave Request has been received</h1>
  <div class="subtitle">Reference #LR-{{ str_pad((string) $leave->id, 5, '0', STR_PAD_LEFT) }} · Submitted {{ $leave->created_at->format('d M Y, h:i A') }}</div>

  <div class="body">

    <div>
      <span class="pill pill-pending">Pending HR Review</span>
    </div>

    {{-- Form summary --}}
    <div class="form-card">
      <div class="form-card-h">Form Summary</div>
      <table class="form-grid">
        <tr><td class="lbl">Submitted By</td>       <td class="val">{{ $emp->name }} ({{ $emp->employee_code }})</td></tr>
        <tr><td class="lbl">Leave Type</td>         <td class="val">{{ $type }}</td></tr>
        @if ($leave->reason_category)
          <tr><td class="lbl">Reason Category</td>  <td class="val">{{ $leave->reason_category }}</td></tr>
        @endif
        <tr><td class="lbl">From</td>               <td class="val">{{ $from }}</td></tr>
        <tr><td class="lbl">To</td>                 <td class="val">{{ $to }}</td></tr>
        <tr><td class="lbl">Total Duration</td>     <td class="val">{{ $leave->days }} day{{ $leave->days != 1 ? 's' : '' }}</td></tr>
      </table>
      @if ($leave->reason)
        <div class="reason-box">
          <span class="h">Reason You Provided</span>
          {{ trim($leave->reason) }}
        </div>
      @endif
    </div>

    <p style="font-size: 13px; color: #5a4d3b; line-height: 1.6; margin-top: 18px;">
      Your manager / HR will review the request and you will receive
      <b>another email</b> with the approval or rejection decision.
      No action is needed from you right now.
    </p>

    <p style="font-size: 13px; color: #5a4d3b; line-height: 1.6; margin-top: 6px;">
      If you submitted this by mistake or need to make changes, please contact HR directly.
    </p>

  </div>

  <div class="footer">
    This is an <b>automated confirmation</b> from the <span class="accent">Carlanisa ERP System</span>.
    Please do not reply to this email — for changes contact <b>hr@carlanisa.com</b>.
  </div>

</div>
</body>
</html>
