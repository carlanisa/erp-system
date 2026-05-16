@php
  $isCancelled = (bool) ($or->is_cancelled ?? false);
  $receivedFrom= $or->received_from ?: '—';
  $receivedIn  = optional($or->bankAccount)->name ?? optional($or->account)->name ?? '—';
  $refNo       = $or->reference ?: '—';
  $chequeNo    = $or->cheque_number ?: '—';
  $branch      = $or->branch_code ?: 'HEAD OFFICE';
  $createdBy   = optional($or->createdBy)->name ?? '—';
  $dateStr     = $or->date ? \Illuminate\Support\Carbon::parse($or->date)->format('d M Y') : '—';
  $payMethod   = $or->payment_method ? strtoupper(str_replace('_',' ', $or->payment_method)) : '—';
  $totalAmount = (float) ($or->amount ?: $or->lines->sum('amount'));
  $statusKey   = $isCancelled ? 'cancelled' : 'issued';
  $statusLabel = $isCancelled ? 'Cancelled' : 'Issued';
@endphp

@extends('pdf._layout')

@section('title', 'Official Receipt — ' . $or->or_number)
@section('doc-title', 'Official Receipt')
@section('doc-sub', 'Cash &amp; Bank · Collection')
@section('doc-num-label', 'Receipt No.')
@section('doc-num-value', $or->or_number)
@section('status-pill')
  <span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span>
@endsection

@section('meta-left-title', 'Received From')
@section('meta-left')
  <div class="meta-row"><span class="lbl">Customer</span><span class="val">{{ strtoupper($receivedFrom) }}</span></div>
  <div class="meta-row"><span class="lbl">Received In</span><span class="val">{{ strtoupper($receivedIn) }}</span></div>
  <div class="meta-row"><span class="lbl">Method</span><span class="val">{{ $payMethod }}</span></div>
  <div class="meta-row"><span class="lbl">Cheque No.</span><span class="val">{{ $chequeNo }}</span></div>
@endsection

@section('meta-right-title', 'Receipt Details')
@section('meta-right')
  <div class="meta-row"><span class="lbl">Date</span><span class="val">{{ $dateStr }}</span></div>
  <div class="meta-row"><span class="lbl">Reference</span><span class="val">{{ $refNo }}</span></div>
  <div class="meta-row"><span class="lbl">Branch</span><span class="val">{{ strtoupper($branch) }}</span></div>
  <div class="meta-row"><span class="lbl">Issued By</span><span class="val">{{ strtoupper($createdBy) }}</span></div>
@endsection

@section('line-headers')
  <th style="width: 8%;">#</th>
  <th style="width: 32%;">Account</th>
  <th style="width: 45%;">Description</th>
  <th class="amt" style="width: 15%;">Amount (RM)</th>
@endsection

@section('line-rows')
  @forelse ($or->lines as $i => $ln)
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

@section('grand-label', 'Total Received (RM)')
@section('total-amount', number_format($totalAmount, 2))

@section('sig-left', 'Issued By')
@section('sig-left-name', 'Cashier / Accounts')
@section('sig-right', 'Received By')
@section('sig-right-name', strtoupper($receivedFrom))

@if (trim((string) $or->description) !== '')
  @section('notes')
    <b>Notes:</b> {{ $or->description }}
  @endsection
@endif
