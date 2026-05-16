@php
  $isCancelled = (bool) ($pv->is_cancelled ?? false);
  $payTo       = $pv->payee ?: optional($pv->lines->first())->account->name ?? '—';
  $payFrom     = optional($pv->bankAccount)->name ?? optional($pv->account)->name ?? '—';
  $refNo       = $pv->reference ?: '—';
  $chequeNo    = $pv->cheque_number ?: '—';
  $branch      = $pv->branch_code ?: 'HEAD OFFICE';
  $createdBy   = optional($pv->createdBy)->name ?? '—';
  $dateStr     = $pv->date ? \Illuminate\Support\Carbon::parse($pv->date)->format('d M Y') : '—';
  $payMethod   = $pv->payment_method ? strtoupper(str_replace('_',' ', $pv->payment_method)) : '—';
  $totalAmount = (float) ($pv->amount ?: $pv->lines->sum('amount'));
  $paidAmount  = (float) ($pv->paid_amount ?? 0);
  $outstanding = max(0, $totalAmount - $paidAmount);
  $statusKey   = $isCancelled ? 'cancelled' : ($paidAmount <= 0 ? 'unpaid' : ($paidAmount >= $totalAmount ? 'paid' : 'partial'));
  $statusLabel = $isCancelled ? 'Cancelled' : ($statusKey === 'paid' ? 'Paid' : ($statusKey === 'partial' ? 'Partially Paid' : 'Unpaid'));
@endphp

@extends('pdf._layout')

@section('title', 'Payment Voucher — ' . $pv->pv_number)
@section('doc-title', 'Payment Voucher')
@section('doc-sub', 'Cash &amp; Bank · Disbursement')
@section('doc-num-label', 'Voucher No.')
@section('doc-num-value', $pv->pv_number)
@section('status-pill')
  <span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span>
@endsection

@section('meta-left-title', 'Payment To')
@section('meta-left')
  <div class="meta-row"><span class="lbl">Payee</span><span class="val">{{ strtoupper($payTo) }}</span></div>
  <div class="meta-row"><span class="lbl">Pay From</span><span class="val">{{ strtoupper($payFrom) }}</span></div>
  <div class="meta-row"><span class="lbl">Method</span><span class="val">{{ $payMethod }}</span></div>
  <div class="meta-row"><span class="lbl">Cheque No.</span><span class="val">{{ $chequeNo }}</span></div>
@endsection

@section('meta-right-title', 'Voucher Details')
@section('meta-right')
  <div class="meta-row"><span class="lbl">Date</span><span class="val">{{ $dateStr }}</span></div>
  <div class="meta-row"><span class="lbl">Reference</span><span class="val">{{ $refNo }}</span></div>
  <div class="meta-row"><span class="lbl">Branch</span><span class="val">{{ strtoupper($branch) }}</span></div>
  <div class="meta-row"><span class="lbl">Prepared By</span><span class="val">{{ strtoupper($createdBy) }}</span></div>
@endsection

@section('line-headers')
  <th style="width: 8%;">#</th>
  <th style="width: 32%;">Account</th>
  <th style="width: 45%;">Description</th>
  <th class="amt" style="width: 15%;">Amount (RM)</th>
@endsection

@section('line-rows')
  @forelse ($pv->lines as $i => $ln)
    @php
      $acct       = $ln->account;
      $parent     = $acct?->parent;
      $parentName = $parent?->name ?? '';
      $parentCode = $parent?->code ?? '';
      $acctCode   = $acct?->code ?? '';
      $acctName   = $acct?->name ?? '';
      $desc       = trim((string) $ln->description);
    @endphp
    <tr>
      <td style="color:#94a3b8;">{{ $i + 1 }}</td>
      <td>
        @if ($parentName)
          <div class="acct-parent">{{ strtoupper($parentName) }} <span class="pc">({{ $parentCode }})</span></div>
        @endif
        <div class="acct-code">{{ $acctCode }}</div>
        @if ($acctName) <div class="acct-name">{{ $acctName }}</div> @endif
      </td>
      <td><div class="desc-main">{{ $desc ?: '—' }}</div></td>
      <td class="amt">{{ number_format((float) $ln->amount, 2) }}</td>
    </tr>
  @empty
    <tr>
      <td colspan="4" style="padding: 24px; text-align: center; color:#94a3b8;">No line items.</td>
    </tr>
  @endforelse
@endsection

@section('totals-rows')
  <tr><td class="lbl">Subtotal</td><td class="val">{{ number_format($totalAmount, 2) }}</td></tr>
  @if (($pv->bank_charges ?? 0) > 0)
    <tr><td class="lbl">Bank Charges</td><td class="val">{{ number_format((float) $pv->bank_charges, 2) }}</td></tr>
  @endif
  @if ($paidAmount > 0)
    <tr><td class="lbl">Paid To-Date</td><td class="val" style="color:#166534;">{{ number_format($paidAmount, 2) }}</td></tr>
    <tr><td class="lbl">Outstanding</td><td class="val" style="color:#991b1b;">{{ number_format($outstanding, 2) }}</td></tr>
  @endif
@endsection

@section('grand-label', 'Grand Total (RM)')
@section('total-amount', number_format($totalAmount, 2))

@section('sig-left', 'Approved By')
@section('sig-left-name', 'Authorised Signatory')
@section('sig-right', 'Received By')
@section('sig-right-name', strtoupper($payTo))

@if (trim((string) $pv->description) !== '')
  @section('notes')
    <b>Notes:</b> {{ $pv->description }}
  @endsection
@endif
