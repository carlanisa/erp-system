@php
  $isCancelled = (bool) ($pi->is_cancelled ?? false);
  $supplier    = $pi->supplier;
  $supName     = $supplier?->name ?: '—';
  $supCode     = $supplier?->supplier_code ?: '';
  $supContact  = $supplier?->contact_person ?? null;
  $supPhone    = $supplier?->phone ?? null;
  $supEmail    = $supplier?->email ?? null;
  $supAddr     = $supplier?->address ?? null;
  $payFrom     = optional($pi->bankAccount)->name ?? optional($pi->account)->name ?? '—';
  $supInvNo    = $pi->supplier_invoice_no ?: '—';
  $refNo       = $pi->reference ?: '—';
  $branch      = $pi->branch_code ?: 'HEAD OFFICE';
  $createdBy   = optional($pi->createdBy)->name ?? '—';
  $dateStr     = $pi->date ? \Illuminate\Support\Carbon::parse($pi->date)->format('d M Y') : '—';
  $dueStr      = $pi->due_date ? \Illuminate\Support\Carbon::parse($pi->due_date)->format('d M Y') : '—';
  $payMethod   = $pi->payment_method ? strtoupper(str_replace('_',' ', $pi->payment_method)) : '—';

  $linesTotal  = (float) $pi->lines->sum('amount');
  $bankCharges = (float) ($pi->bank_charges ?? 0);
  $totalAmount = (float) ($pi->amount ?: ($linesTotal + $bankCharges));
  $paidAmount  = (float) ($pi->paid_amount ?? 0);
  $outstanding = max(0, $totalAmount - $paidAmount);

  $statusKey   = $isCancelled ? 'cancelled' : ($paidAmount <= 0 ? 'unpaid' : ($paidAmount >= $totalAmount ? 'paid' : 'partial'));
  $statusLabel = $isCancelled ? 'Cancelled' : ($statusKey === 'paid' ? 'Paid' : ($statusKey === 'partial' ? 'Partially Paid' : 'Unpaid'));
  $hasFabric   = $pi->lines->contains(fn ($l) => $l->color || $l->size || $l->qty);
@endphp

@extends('pdf._layout')

@section('title', 'Purchase Invoice — ' . $pi->pi_number)
@section('doc-title', 'Purchase Invoice')
@section('doc-sub', 'Accounts Payable · Supplier Bill')
@section('doc-num-label', 'Invoice No.')
@section('doc-num-value', $pi->pi_number)
@section('status-pill')
  <span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span>
@endsection

@section('meta-left-title', 'Bill From — Supplier')
@section('meta-left')
  <div class="meta-row"><span class="lbl">Supplier</span><span class="val">{{ strtoupper($supName) }}{{ $supCode ? ' (' . $supCode . ')' : '' }}</span></div>
  @if ($supContact)
    <div class="meta-row"><span class="lbl">Attn</span><span class="val">{{ $supContact }}</span></div>
  @endif
  @if ($supAddr)
    <div class="meta-row"><span class="lbl">Address</span><span class="val">{{ $supAddr }}</span></div>
  @endif
  @if ($supPhone)
    <div class="meta-row"><span class="lbl">Phone</span><span class="val">{{ $supPhone }}</span></div>
  @endif
  @if ($supEmail)
    <div class="meta-row"><span class="lbl">Email</span><span class="val">{{ $supEmail }}</span></div>
  @endif
  <div class="meta-row"><span class="lbl">Pay From</span><span class="val">{{ strtoupper($payFrom) }}</span></div>
@endsection

@section('meta-right-title', 'Invoice Details')
@section('meta-right')
  <div class="meta-row"><span class="lbl">Invoice Date</span><span class="val">{{ $dateStr }}</span></div>
  <div class="meta-row"><span class="lbl">Due Date</span><span class="val">{{ $dueStr }}</span></div>
  <div class="meta-row"><span class="lbl">Supplier Inv</span><span class="val">{{ $supInvNo }}</span></div>
  <div class="meta-row"><span class="lbl">Reference</span><span class="val">{{ $refNo }}</span></div>
  <div class="meta-row"><span class="lbl">Method</span><span class="val">{{ $payMethod }}</span></div>
  <div class="meta-row"><span class="lbl">Branch</span><span class="val">{{ strtoupper($branch) }}</span></div>
  <div class="meta-row"><span class="lbl">Created By</span><span class="val">{{ strtoupper($createdBy) }}</span></div>
@endsection

@section('line-headers')
  @if ($hasFabric)
    <th style="width: 5%;">#</th>
    <th style="width: 19%;">Item / Account</th>
    <th style="width: 12%;">Color</th>
    <th style="width: 8%;">Size</th>
    <th class="amt" style="width: 8%;">Qty</th>
    <th class="amt" style="width: 7%;">Roll</th>
    <th style="width: 6%;">UOM</th>
    <th class="amt" style="width: 10%;">Unit Cost</th>
    <th class="amt" style="width: 9%;">Disc</th>
    <th class="amt" style="width: 16%;">Amount (RM)</th>
  @else
    <th style="width: 8%;">#</th>
    <th style="width: 32%;">Account</th>
    <th style="width: 45%;">Description</th>
    <th class="amt" style="width: 15%;">Amount (RM)</th>
  @endif
@endsection

@section('line-rows')
  @forelse ($pi->lines as $i => $ln)
    @php
      $acct       = $ln->account;
      $parent     = $acct?->parent;
      $parentName = $parent?->name ?? '';
      $parentCode = $parent?->code ?? '';
      $acctCode   = $acct?->code ?? '';
      $acctName   = $acct?->name ?? '';
      $desc       = trim((string) $ln->description);
    @endphp
    @if ($hasFabric)
      <tr>
        <td style="color:#94a3b8;">{{ $i + 1 }}</td>
        <td>
          @if ($parentName)
            <div class="acct-parent">{{ strtoupper($parentName) }} <span class="pc">({{ $parentCode }})</span></div>
          @endif
          <div class="acct-code">{{ $ln->item_code ?: $acctCode ?: '—' }}</div>
          @if ($desc) <div class="acct-name">{{ $desc }}</div> @endif
        </td>
        <td>{{ $ln->color ?: '—' }}</td>
        <td>{{ $ln->size ?: '—' }}</td>
        <td class="amt">{{ $ln->qty ? number_format((float) $ln->qty, 2) : '—' }}</td>
        <td class="amt">{{ $ln->roll_count ? number_format((float) $ln->roll_count, 0) : '—' }}</td>
        <td>{{ $ln->uom ?: '—' }}</td>
        <td class="amt">{{ $ln->unit_cost ? number_format((float) $ln->unit_cost, 2) : '—' }}</td>
        <td class="amt">{{ $ln->discount ? number_format((float) $ln->discount, 2) : '—' }}</td>
        <td class="amt">{{ number_format((float) $ln->amount, 2) }}</td>
      </tr>
    @else
      <tr>
        <td style="color:#94a3b8;">{{ $i + 1 }}</td>
        <td>
          @if ($parentName)
            <div class="acct-parent">{{ strtoupper($parentName) }} <span class="pc">({{ $parentCode }})</span></div>
          @endif
          <div class="acct-code">{{ $acctCode ?: '—' }}</div>
          @if ($acctName) <div class="acct-name">{{ $acctName }}</div> @endif
        </td>
        <td><div class="desc-main">{{ $desc ?: '—' }}</div></td>
        <td class="amt">{{ number_format((float) $ln->amount, 2) }}</td>
      </tr>
    @endif
  @empty
    <tr>
      <td colspan="{{ $hasFabric ? 10 : 4 }}" style="padding: 24px; text-align: center; color:#94a3b8;">No line items.</td>
    </tr>
  @endforelse
@endsection

@section('totals-rows')
  <tr><td class="lbl">Subtotal</td><td class="val">{{ number_format($linesTotal, 2) }}</td></tr>
  @if ($bankCharges > 0)
    <tr><td class="lbl">Bank Charges</td><td class="val">{{ number_format($bankCharges, 2) }}</td></tr>
  @endif
  @if ($paidAmount > 0)
    <tr><td class="lbl">Paid To-Date</td><td class="val" style="color:#166534;">{{ number_format($paidAmount, 2) }}</td></tr>
    <tr><td class="lbl">Outstanding</td><td class="val" style="color:#991b1b;">{{ number_format($outstanding, 2) }}</td></tr>
  @endif
@endsection

@section('grand-label', 'Grand Total (RM)')
@section('total-amount', number_format($totalAmount, 2))

@section('sig-left', 'Prepared By')
@section('sig-left-name', strtoupper($createdBy))
@section('sig-right', 'Approved By')
@section('sig-right-name', 'Authorised Signatory')

@if (trim((string) $pi->description) !== '')
  @section('notes')
    <b>Notes:</b> {{ $pi->description }}
  @endsection
@endif
