@php
  $isCancelled = (bool) ($ap->is_cancelled ?? false);
  $supplierName= $ap->supplier_name ?: '—';
  $depositFrom = optional($ap->bankAccount)->name ?? optional($ap->account)->name ?? '—';
  $refNo       = $ap->reference ?: '—';
  $chequeNo    = $ap->cheque_number ?: '—';
  $branch      = $ap->branch_code ?: 'HEAD OFFICE';
  $createdBy   = optional($ap->createdBy)->name ?? '—';
  $dateStr     = $ap->date ? \Illuminate\Support\Carbon::parse($ap->date)->format('d M Y') : '—';
  $payMethod   = $ap->payment_method ? strtoupper(str_replace('_',' ', $ap->payment_method)) : '—';
  $totalAmount = (float) ($ap->amount ?: $ap->lines->sum('amount'));
  $statusKey   = $isCancelled ? 'cancelled' : 'issued';
  $statusLabel = $isCancelled ? 'Cancelled' : 'Deposited';
@endphp

@extends('pdf._layout')

@section('title', 'A/P Deposit — ' . $ap->deposit_number)
@section('doc-title', 'A/P Deposit Slip')
@section('doc-sub', 'Accounts Payable · Supplier Advance')
@section('doc-num-label', 'Deposit No.')
@section('doc-num-value', $ap->deposit_number)
@section('status-pill')
  <span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span>
@endsection

@section('meta-left-title', 'Supplier / Beneficiary')
@section('meta-left')
  <div class="meta-row"><span class="lbl">Supplier</span><span class="val">{{ strtoupper($supplierName) }}</span></div>
  <div class="meta-row"><span class="lbl">Paid From</span><span class="val">{{ strtoupper($depositFrom) }}</span></div>
  <div class="meta-row"><span class="lbl">Method</span><span class="val">{{ $payMethod }}</span></div>
  <div class="meta-row"><span class="lbl">Cheque No.</span><span class="val">{{ $chequeNo }}</span></div>
@endsection

@section('meta-right-title', 'Deposit Details')
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
  @forelse ($ap->lines as $i => $ln)
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
@endsection

@section('grand-label', 'Total Deposited (RM)')
@section('total-amount', number_format($totalAmount, 2))

@section('sig-left', 'Prepared By')
@section('sig-left-name', strtoupper($createdBy))
@section('sig-right', 'Approved By')
@section('sig-right-name', 'Authorised Signatory')

@if (trim((string) $ap->description) !== '')
  @section('notes')
    <b>Notes:</b> {{ $ap->description }}
  @endsection
@endif
