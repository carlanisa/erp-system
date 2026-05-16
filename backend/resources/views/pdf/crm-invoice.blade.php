@php
  $isCancelled = (bool) ($ci->is_cancelled ?? false);
  $cust        = $ci->customer;
  $custName    = $cust?->name ?: ($ci->walk_in_name ?: '— Walk-in —');
  $custContact = $cust?->phone ?? null;
  $custEmail   = $cust?->email ?? null;
  $custAddr    = $cust?->address ?? null;
  $custCity    = $cust?->city ?? null;
  $custTaxNo   = $cust?->tax_number ?? null;
  $payInto     = optional($ci->bankAccount ?? null)->name ?? '—';
  $custInvNo   = $ci->customer_invoice_no ?: '—';
  $refNo       = $ci->reference ?: '—';
  $branch      = $ci->branch_code ?: 'HEAD OFFICE';
  $createdBy   = optional($ci->createdBy ?? null)->name ?? '—';
  $dateStr     = $ci->date     ? \Illuminate\Support\Carbon::parse($ci->date)->format('d M Y')     : '—';
  $dueStr      = $ci->due_date ? \Illuminate\Support\Carbon::parse($ci->due_date)->format('d M Y') : '—';
  $payMethod   = $ci->payment_method ? strtoupper(str_replace('_',' ', $ci->payment_method)) : '—';
  $terms       = $ci->terms ?: '—';

  $linesTotal  = (float) $ci->items->sum('line_total');
  $discTotal   = (float) ($ci->discount_total ?? 0);
  $taxTotal    = (float) ($ci->tax_total ?? 0);
  $bankCharges = (float) ($ci->bank_charges ?? 0);
  $totalAmount = (float) ($ci->amount ?: $linesTotal);
  $paidAmount  = (float) ($ci->paid_amount ?? 0);
  $outstanding = max(0, $totalAmount - $paidAmount);

  $statusKey   = $isCancelled ? 'cancelled' : ($paidAmount <= 0 ? 'unpaid' : ($paidAmount >= $totalAmount ? 'paid' : 'partial'));
  $statusLabel = $isCancelled ? 'Cancelled' : ($statusKey === 'paid' ? 'Paid' : ($statusKey === 'partial' ? 'Partially Paid' : 'Unpaid'));
  $hasProducts = $ci->items->contains(fn ($l) => $l->color || $l->size || $l->qty || $l->item_code);
@endphp

@extends('pdf._layout')

@section('title', 'Customer Invoice — ' . $ci->invoice_no)
@section('doc-title', 'Customer Invoice')
@section('doc-sub', 'Accounts Receivable · Customer Bill')
@section('doc-num-label', 'Invoice No.')
@section('doc-num-value', $ci->invoice_no)
@section('status-pill')
  <span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span>
@endsection

@section('meta-left-title', 'Bill To — Customer')
@section('meta-left')
  <div class="meta-row"><span class="lbl">Customer</span><span class="val">{{ strtoupper($custName) }}</span></div>
  @if ($custAddr)
    <div class="meta-row"><span class="lbl">Address</span><span class="val">{{ $custAddr }}</span></div>
  @endif
  @if ($custCity)
    <div class="meta-row"><span class="lbl">City</span><span class="val">{{ $custCity }}</span></div>
  @endif
  @if ($custContact)
    <div class="meta-row"><span class="lbl">Phone</span><span class="val">{{ $custContact }}</span></div>
  @endif
  @if ($custEmail)
    <div class="meta-row"><span class="lbl">Email</span><span class="val">{{ $custEmail }}</span></div>
  @endif
  @if ($custTaxNo)
    <div class="meta-row"><span class="lbl">Tax No.</span><span class="val">{{ $custTaxNo }}</span></div>
  @endif
  <div class="meta-row"><span class="lbl">Receive Into</span><span class="val">{{ strtoupper($payInto) }}</span></div>
@endsection

@section('meta-right-title', 'Invoice Details')
@section('meta-right')
  <div class="meta-row"><span class="lbl">Invoice Date</span><span class="val">{{ $dateStr }}</span></div>
  <div class="meta-row"><span class="lbl">Due Date</span><span class="val">{{ $dueStr }}</span></div>
  <div class="meta-row"><span class="lbl">Customer Inv</span><span class="val">{{ $custInvNo }}</span></div>
  <div class="meta-row"><span class="lbl">Reference</span><span class="val">{{ $refNo }}</span></div>
  <div class="meta-row"><span class="lbl">Terms</span><span class="val">{{ $terms }}</span></div>
  <div class="meta-row"><span class="lbl">Method</span><span class="val">{{ $payMethod }}</span></div>
  <div class="meta-row"><span class="lbl">Branch</span><span class="val">{{ strtoupper($branch) }}</span></div>
  <div class="meta-row"><span class="lbl">Created By</span><span class="val">{{ strtoupper($createdBy) }}</span></div>
@endsection

@section('line-headers')
  @if ($hasProducts)
    <th style="width: 5%;">#</th>
    <th style="width: 19%;">Item / SKU</th>
    <th style="width: 12%;">Color</th>
    <th style="width: 8%;">Size</th>
    <th class="amt" style="width: 8%;">Qty</th>
    <th class="amt" style="width: 7%;">Roll</th>
    <th style="width: 6%;">UOM</th>
    <th class="amt" style="width: 10%;">Unit Price</th>
    <th class="amt" style="width: 9%;">Disc</th>
    <th class="amt" style="width: 16%;">Amount (RM)</th>
  @else
    <th style="width: 8%;">#</th>
    <th style="width: 32%;">Item</th>
    <th style="width: 45%;">Description</th>
    <th class="amt" style="width: 15%;">Amount (RM)</th>
  @endif
@endsection

@section('line-rows')
  @forelse ($ci->items as $i => $ln)
    @php $desc = trim((string) $ln->description); @endphp
    @if ($hasProducts)
      <tr>
        <td style="color:#94a3b8;">{{ $i + 1 }}</td>
        <td>
          <div class="acct-code">{{ $ln->item_code ?: '—' }}</div>
          @if ($desc) <div class="acct-name">{{ $desc }}</div> @endif
        </td>
        <td>{{ $ln->color ?: '—' }}</td>
        <td>{{ $ln->size ?: '—' }}</td>
        <td class="amt">{{ $ln->qty ? number_format((float) $ln->qty, 2) : '—' }}</td>
        <td class="amt">{{ $ln->roll_count ? number_format((float) $ln->roll_count, 0) : '—' }}</td>
        <td>{{ $ln->uom ?: '—' }}</td>
        <td class="amt">{{ $ln->unit_price ? number_format((float) $ln->unit_price, 2) : '—' }}</td>
        <td class="amt">{{ $ln->discount ? number_format((float) $ln->discount, 2) : '—' }}</td>
        <td class="amt">{{ number_format((float) $ln->line_total, 2) }}</td>
      </tr>
    @else
      <tr>
        <td style="color:#94a3b8;">{{ $i + 1 }}</td>
        <td><div class="acct-name">{{ $ln->item_code ?: '—' }}</div></td>
        <td><div class="desc-main">{{ $desc ?: '—' }}</div></td>
        <td class="amt">{{ number_format((float) $ln->line_total, 2) }}</td>
      </tr>
    @endif
  @empty
    <tr>
      <td colspan="{{ $hasProducts ? 10 : 4 }}" style="padding: 24px; text-align: center; color:#94a3b8;">No line items.</td>
    </tr>
  @endforelse
@endsection

@section('totals-rows')
  <tr><td class="lbl">Subtotal</td><td class="val">{{ number_format($linesTotal - $taxTotal + $discTotal, 2) }}</td></tr>
  @if ($discTotal > 0)
    <tr><td class="lbl">Discount</td><td class="val" style="color:#92400e;">-{{ number_format($discTotal, 2) }}</td></tr>
  @endif
  @if ($taxTotal > 0)
    <tr><td class="lbl">Tax</td><td class="val">{{ number_format($taxTotal, 2) }}</td></tr>
  @endif
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
@section('sig-right', 'Authorised Signatory')
@section('sig-right-name', '')

@if (trim((string) $ci->notes) !== '')
  @section('notes')
    <b>Notes:</b> {{ $ci->notes }}
  @endsection
@endif
