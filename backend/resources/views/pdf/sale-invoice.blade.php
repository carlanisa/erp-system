@php
  $isCancelled = (bool) ($si->is_cancelled ?? false);
  $customer    = $si->customer;
  $custName    = $customer?->name ?: ($si->walk_in_name ?: '—');
  $custEmail   = $customer?->email ?? null;
  $custPhone   = $customer?->phone ?? null;
  $custAddr    = $customer?->address ?? null;
  $custCity    = $customer?->city ?? null;
  $custTax     = $customer?->tax_number ?? null;
  $payInto     = optional($si->bankAccount)->name ?? optional($si->account)->name ?? '—';
  $custInvNo   = $si->customer_invoice_no ?: '—';
  $refNo       = $si->reference ?: '—';
  $branch      = $si->branch_code ?: 'HEAD OFFICE';
  $source      = strtoupper($si->source ?: 'erp');
  $createdBy   = optional($si->createdBy)->name ?? '—';
  $dateStr     = $si->date ? \Illuminate\Support\Carbon::parse($si->date)->format('d M Y') : '—';
  $dueStr      = $si->due_date ? \Illuminate\Support\Carbon::parse($si->due_date)->format('d M Y') : '—';
  $payMethod   = $si->payment_method ? strtoupper(str_replace('_',' ', $si->payment_method)) : '—';

  $linesTotal  = (float) $si->lines->sum('amount');
  $discTotal   = (float) ($si->discount_total ?? 0);
  $taxTotal    = (float) ($si->tax_total ?? 0);
  $totalAmount = (float) ($si->amount ?: $linesTotal);
  $paidAmount  = (float) ($si->paid_amount ?? 0);
  $changeAmt   = (float) ($si->change_amount ?? 0);
  $outstanding = max(0, $totalAmount - $paidAmount);
  $subtotal    = $linesTotal - $taxTotal + $discTotal;

  $statusKey   = $isCancelled ? 'cancelled' : ($paidAmount <= 0 ? 'unpaid' : ($paidAmount >= $totalAmount ? 'paid' : 'partial'));
  $statusLabel = $isCancelled ? 'Cancelled' : ($statusKey === 'paid' ? 'Paid' : ($statusKey === 'partial' ? 'Partial' : 'Unpaid'));
  $hasFabric   = $si->lines->contains(fn ($l) => $l->color || $l->size || ($l->qty && $l->qty != 1));
@endphp
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sale Invoice — {{ $si->si_number }}</title>
<style>
  /* ── Page setup ── */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 10.5px;
    color: #2d2418;
    line-height: 1.5;
    background: #fffdf9;
  }

  /* ── Warm-cream palette ─────────────────
     accent  : #b3573a  (terracotta — app sidebar accent)
     accent-d: #8a3d22  (deep terracotta for emphasis)
     ink-900 : #2d2418  (warm dark — body text)
     ink-700 : #5a4d3b  (warm gray)
     ink-500 : #8a7d68  (muted)
     cream-50: #fffdf9  (page bg)
     cream-100: #faf6ef (soft cream block)
     cream-200: #f3ecdf (card bg)
     cream-300: #e7dcc6 (hairline border)
  */

  .page-frame { padding: 40px 44px 28px 44px; position: relative; }

  /* Top accent bar — terracotta gradient */
  .top-accent {
    height: 4px;
    background: #b3573a;
  }
  .top-accent-thin {
    height: 1px;
    background: #d4a888;
    margin-bottom: 0;
  }

  /* ── Brand header ── */
  .brand-row { display: table; width: 100%; margin-bottom: 30px; }
  .brand-l, .brand-r { display: table-cell; vertical-align: top; }
  .brand-r { text-align: right; }

  .brand-name {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: #2d2418;
    text-transform: uppercase;
  }
  .brand-reg {
    font-size: 9px;
    color: #8a7d68;
    letter-spacing: 0.6px;
    margin-top: 3px;
    text-transform: uppercase;
  }
  .brand-addr {
    font-size: 9.5px;
    color: #5a4d3b;
    line-height: 1.7;
  }
  .brand-addr a { color: #b3573a; text-decoration: none; font-weight: 600; }

  /* ── Title block (left) + invoice card (right) ── */
  .title-row { display: table; width: 100%; margin-bottom: 26px; }
  .title-l, .title-r { display: table-cell; vertical-align: top; }
  .title-r { text-align: right; }

  .doc-title {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: 4px;
    color: #2d2418;
    margin: 0;
    text-transform: uppercase;
    line-height: 1;
  }
  .doc-title .accent { color: #b3573a; }
  .doc-sub {
    font-size: 9.5px;
    color: #8a7d68;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-top: 6px;
    font-weight: 600;
  }

  .inv-card {
    display: inline-block;
    background: #faf6ef;
    border: 1px solid #e7dcc6;
    border-left: 3px solid #b3573a;
    padding: 10px 18px;
    border-radius: 3px;
    text-align: left;
    min-width: 170px;
  }
  .inv-card-label {
    font-size: 8.5px;
    color: #8a7d68;
    letter-spacing: 1.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .inv-card-value {
    font-size: 16px;
    color: #b3573a;
    font-weight: 800;
    letter-spacing: 0.6px;
    margin-top: 3px;
  }

  /* ── Status pill ── */
  .status-pill {
    display: inline-block;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 4px 11px;
    border-radius: 999px;
    margin-top: 8px;
    border: 1px solid;
  }
  .status-paid      { background: #dcf5e3; color: #1b6b34; border-color: #95dbab; }
  .status-partial   { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
  .status-unpaid    { background: #fde2e2; color: #9b1c1c; border-color: #fca5a5; }
  .status-cancelled { background: #f0eae0; color: #5a4d3b; border-color: #d6c8af; }

  /* ── Two-column meta cards ── */
  .meta-row-wrap {
    display: table;
    width: 100%;
    border-collapse: separate;
    border-spacing: 14px 0;
    margin-bottom: 18px;
    width: calc(100% + 28px);
    margin-left: -14px;
  }
  .meta-card {
    display: table-cell;
    width: 50%;
    background: #faf6ef;
    border: 1px solid #e7dcc6;
    border-radius: 4px;
    padding: 14px 18px;
    vertical-align: top;
  }
  .meta-h {
    font-size: 8.5px;
    color: #b3573a;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    font-weight: 800;
    padding-bottom: 9px;
    border-bottom: 1px solid #e7dcc6;
    margin-bottom: 11px;
  }
  .meta-row { display: table; width: 100%; padding: 3px 0; }
  .meta-row .lbl, .meta-row .val { display: table-cell; vertical-align: top; }
  .meta-row .lbl {
    width: 36%;
    font-size: 9px;
    color: #8a7d68;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .meta-row .val {
    font-size: 10.5px;
    color: #2d2418;
    font-weight: 700;
  }

  /* ── Line items table ── */
  .lines {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 6px 0;
    border: 1px solid #e7dcc6;
    border-radius: 4px;
    overflow: hidden;
  }
  .lines thead th {
    background: #faf6ef;
    color: #5a4d3b;
    text-align: left;
    padding: 11px 14px;
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 800;
    border-bottom: 2px solid #b3573a;
  }
  .lines thead th.amt { text-align: right; }
  .lines tbody td {
    padding: 11px 14px;
    vertical-align: top;
    border-bottom: 1px solid #f0eae0;
    font-size: 10.5px;
  }
  .lines tbody tr:last-child td { border-bottom: none; }
  .lines tbody tr:nth-child(even) td { background: #fffaf2; }
  .lines tbody td.amt {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .lines tbody td.idx { color: #b3573a; font-weight: 700; }

  .item-code {
    font-weight: 800;
    color: #2d2418;
    font-size: 10.5px;
  }
  .item-desc {
    color: #5a4d3b;
    font-size: 9.5px;
    margin-top: 2px;
    white-space: pre-wrap;
  }

  /* ── Summary block ── */
  .summary-wrap { display: table; width: 100%; margin-top: 16px; }
  .summary-l, .summary-r { display: table-cell; vertical-align: top; }
  .summary-l { width: 58%; padding-right: 16px; }
  .summary-r { width: 42%; }

  .words-card {
    background: #faf6ef;
    border: 1px solid #e7dcc6;
    border-left: 3px solid #b3573a;
    padding: 12px 16px;
    border-radius: 4px;
  }
  .words-h {
    font-size: 8.5px;
    color: #8a7d68;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-weight: 700;
  }
  .words-text {
    color: #2d2418;
    font-size: 10.5px;
    font-weight: 700;
    margin-top: 5px;
    line-height: 1.55;
  }
  .words-curr {
    font-weight: 800;
    color: #b3573a;
    letter-spacing: 0.5px;
  }

  .totals {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e7dcc6;
    border-radius: 4px;
    overflow: hidden;
    background: #ffffff;
  }
  .totals td { padding: 9px 16px; font-size: 10.5px; }
  .totals td.lbl {
    color: #5a4d3b;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .totals td.val {
    text-align: right;
    font-weight: 700;
    color: #2d2418;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .totals tr.alt td { background: #fffaf2; }
  .totals tr.paid td { color: #1b6b34; }
  .totals tr.outstanding td { color: #9b1c1c; }
  .totals tr.grand td {
    background: #b3573a;
    color: #fffdf9;
    padding: 13px 16px;
    border-top: 0;
  }
  .totals tr.grand td.lbl {
    color: #ffe6cf;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-size: 10px;
    font-weight: 800;
  }
  .totals tr.grand td.val {
    color: #fffdf9;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.4px;
  }

  /* ── Notes ── */
  .notes {
    margin-top: 14px;
    padding: 11px 16px;
    border: 1px dashed #d4a888;
    border-radius: 4px;
    background: #fffaf2;
    font-size: 9.5px;
    color: #5a4d3b;
  }
  .notes b { color: #b3573a; font-weight: 800; }

  /* ── Signatures ── */
  .sigs {
    margin-top: 38px;
    width: 100%;
    border-collapse: separate;
    border-spacing: 24px 0;
  }
  .sigs td { width: 50%; vertical-align: top; padding: 0; }
  .sig-line {
    border-top: 1.2px solid #b3573a;
    padding-top: 7px;
  }
  .sig-label {
    font-size: 8.5px;
    color: #8a7d68;
    text-transform: uppercase;
    letter-spacing: 1.3px;
    font-weight: 800;
  }
  .sig-name {
    font-size: 10px;
    color: #2d2418;
    font-weight: 700;
    margin-top: 3px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 22px;
    padding: 10px 0 0 0;
    border-top: 1px solid #e7dcc6;
    font-size: 8.5px;
    color: #8a7d68;
    display: table;
    width: 100%;
  }
  .footer .l, .footer .r { display: table-cell; vertical-align: middle; }
  .footer .r { text-align: right; }
  .footer b { color: #2d2418; font-weight: 800; }
  .footer .accent { color: #b3573a; }

  /* ── Cancelled overlay ── */
  .cancelled-mark {
    position: fixed; top: 38%; left: 0; right: 0;
    text-align: center;
    font-size: 110px; font-weight: 800;
    color: rgba(155, 28, 28, 0.07);
    transform: rotate(-22deg);
    letter-spacing: 8px;
    z-index: 0;
  }

  .filler-row td {
    height: 90px;
    background: transparent !important;
    border: none !important;
  }
</style>
</head>
<body>

@if ($isCancelled)
  <div class="cancelled-mark">CANCELLED</div>
@endif

<div class="top-accent"></div>
<div class="top-accent-thin"></div>

<div class="page-frame">

  {{-- ── Brand header ── --}}
  <div class="brand-row">
    <div class="brand-l">
      <div class="brand-name">CARLANSIA SDN BHD</div>
      <div class="brand-reg">Reg. No. 201901044434  ·  Selangor, Malaysia</div>
    </div>
    <div class="brand-r">
      <div class="brand-addr">
        E-17-02 Jalan Serai Wangi 16M/M<br>
        Shah Alam 40200, Selangor MY<br>
        <a href="mailto:hello@carlanisa.com">hello@carlanisa.com</a>
      </div>
    </div>
  </div>

  {{-- ── Title row ── --}}
  <div class="title-row">
    <div class="title-l">
      <div class="doc-title">Sale <span class="accent">Invoice</span></div>
      <div class="doc-sub">Accounts Receivable  ·  Customer Bill</div>
    </div>
    <div class="title-r">
      <div class="inv-card">
        <div class="inv-card-label">Invoice No.</div>
        <div class="inv-card-value">{{ $si->si_number }}</div>
      </div>
      <div><span class="status-pill status-{{ $statusKey }}">{{ $statusLabel }}</span></div>
    </div>
  </div>

  {{-- ── Meta cards ── --}}
  <table class="meta-row-wrap">
    <tr>
      <td class="meta-card">
        <div class="meta-h">Bill To  ·  Customer</div>
        <div class="meta-row"><span class="lbl">Customer</span><span class="val">{{ strtoupper($custName) }}</span></div>
        @if ($custAddr)
          <div class="meta-row"><span class="lbl">Address</span><span class="val">{{ $custAddr }}{{ $custCity ? ', ' . $custCity : '' }}</span></div>
        @elseif ($custCity)
          <div class="meta-row"><span class="lbl">City</span><span class="val">{{ $custCity }}</span></div>
        @endif
        @if ($custPhone)
          <div class="meta-row"><span class="lbl">Phone</span><span class="val">{{ $custPhone }}</span></div>
        @endif
        @if ($custEmail)
          <div class="meta-row"><span class="lbl">Email</span><span class="val">{{ $custEmail }}</span></div>
        @endif
        @if ($custTax)
          <div class="meta-row"><span class="lbl">Tax No.</span><span class="val">{{ $custTax }}</span></div>
        @endif
        <div class="meta-row"><span class="lbl">Pay Into</span><span class="val">{{ strtoupper($payInto) }}</span></div>
      </td>
      <td class="meta-card">
        <div class="meta-h">Invoice Details</div>
        <div class="meta-row"><span class="lbl">Invoice Date</span><span class="val">{{ $dateStr }}</span></div>
        <div class="meta-row"><span class="lbl">Due Date</span><span class="val">{{ $dueStr }}</span></div>
        <div class="meta-row"><span class="lbl">Customer Inv</span><span class="val">{{ $custInvNo }}</span></div>
        <div class="meta-row"><span class="lbl">Reference</span><span class="val">{{ $refNo }}</span></div>
        <div class="meta-row"><span class="lbl">Method</span><span class="val">{{ $payMethod }}</span></div>
        <div class="meta-row"><span class="lbl">Source</span><span class="val">{{ $source }}</span></div>
        <div class="meta-row"><span class="lbl">Branch</span><span class="val">{{ strtoupper($branch) }}</span></div>
        <div class="meta-row"><span class="lbl">Created By</span><span class="val">{{ strtoupper($createdBy) }}</span></div>
      </td>
    </tr>
  </table>

  {{-- ── Line items ── --}}
  <table class="lines">
    <thead>
      <tr>
        @if ($hasFabric)
          <th style="width: 5%;">#</th>
          <th style="width: 22%;">Item</th>
          <th style="width: 11%;">Color</th>
          <th style="width: 8%;">Size</th>
          <th class="amt" style="width: 8%;">Qty</th>
          <th style="width: 6%;">UOM</th>
          <th class="amt" style="width: 11%;">Unit Price</th>
          <th class="amt" style="width: 9%;">Disc</th>
          <th class="amt" style="width: 7%;">Tax %</th>
          <th class="amt" style="width: 13%;">Amount (RM)</th>
        @else
          <th style="width: 6%;">#</th>
          <th style="width: 50%;">Description</th>
          <th class="amt" style="width: 10%;">Qty</th>
          <th class="amt" style="width: 14%;">Unit Price</th>
          <th class="amt" style="width: 20%;">Amount (RM)</th>
        @endif
      </tr>
    </thead>
    <tbody>
      @forelse ($si->lines as $i => $ln)
        @php
          $desc = trim((string) $ln->description);
          $code = $ln->item_code ?? '';
        @endphp
        @if ($hasFabric)
          <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td>
              <div class="item-code">{{ $code ?: '—' }}</div>
              @if ($desc) <div class="item-desc">{{ $desc }}</div> @endif
            </td>
            <td>{{ $ln->color ?: '—' }}</td>
            <td>{{ $ln->size ?: '—' }}</td>
            <td class="amt">{{ number_format((float) $ln->qty, 2) }}</td>
            <td>{{ $ln->uom ?: '—' }}</td>
            <td class="amt">{{ number_format((float) $ln->unit_price, 2) }}</td>
            <td class="amt">{{ $ln->discount ? number_format((float) $ln->discount, 2) : '—' }}</td>
            <td class="amt">{{ $ln->tax_rate ? number_format((float) $ln->tax_rate, 1) : '—' }}</td>
            <td class="amt">{{ number_format((float) $ln->amount, 2) }}</td>
          </tr>
        @else
          <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td>
              @if ($code) <div class="item-code">{{ $code }}</div> @endif
              <div class="item-desc">{{ $desc ?: '—' }}</div>
            </td>
            <td class="amt">{{ number_format((float) $ln->qty, 2) }}</td>
            <td class="amt">{{ number_format((float) $ln->unit_price, 2) }}</td>
            <td class="amt">{{ number_format((float) $ln->amount, 2) }}</td>
          </tr>
        @endif
      @empty
        <tr>
          <td colspan="{{ $hasFabric ? 10 : 5 }}" style="padding: 24px; text-align: center; color:#8a7d68;">No line items.</td>
        </tr>
      @endforelse
      <tr class="filler-row"><td colspan="{{ $hasFabric ? 10 : 5 }}"></td></tr>
    </tbody>
  </table>

  {{-- ── Summary block ── --}}
  <div class="summary-wrap">
    <div class="summary-l">
      <div class="words-card">
        <div class="words-h">Amount in Words</div>
        <div class="words-text"><span class="words-curr">RINGGIT MALAYSIA</span> {{ strtoupper($amountInWords ?? '') }}</div>
      </div>
      @if (trim((string) $si->description) !== '')
        <div class="notes"><b>Notes:</b> {{ $si->description }}</div>
      @endif
    </div>
    <div class="summary-r">
      <table class="totals">
        <tr><td class="lbl">Subtotal</td><td class="val">{{ number_format($subtotal, 2) }}</td></tr>
        @if ($discTotal > 0)
          <tr class="alt"><td class="lbl">Discount</td><td class="val">- {{ number_format($discTotal, 2) }}</td></tr>
        @endif
        @if ($taxTotal > 0)
          <tr class="alt"><td class="lbl">Tax</td><td class="val">{{ number_format($taxTotal, 2) }}</td></tr>
        @endif
        @if ($paidAmount > 0)
          <tr class="paid"><td class="lbl">Paid To-Date</td><td class="val">{{ number_format($paidAmount, 2) }}</td></tr>
          @if ($outstanding > 0)
            <tr class="outstanding"><td class="lbl">Outstanding</td><td class="val">{{ number_format($outstanding, 2) }}</td></tr>
          @endif
          @if ($changeAmt > 0)
            <tr class="alt"><td class="lbl">Change Given</td><td class="val">{{ number_format($changeAmt, 2) }}</td></tr>
          @endif
        @endif
        <tr class="grand">
          <td class="lbl">Grand Total (RM)</td>
          <td class="val">{{ number_format($totalAmount, 2) }}</td>
        </tr>
      </table>
    </div>
  </div>

  {{-- ── Signatures ── --}}
  <table class="sigs">
    <tr>
      <td>
        <div class="sig-line"></div>
        <div class="sig-label">Issued By</div>
        <div class="sig-name">{{ strtoupper($createdBy) }}</div>
      </td>
      <td>
        <div class="sig-line"></div>
        <div class="sig-label">Customer Acknowledgement</div>
        <div class="sig-name">{{ strtoupper($custName) }}</div>
      </td>
    </tr>
  </table>

  {{-- ── Footer ── --}}
  <div class="footer">
    <div class="l">
      <b>CARLANSIA SDN BHD</b>  <span class="accent">·</span>  Sale Invoice  <span class="accent">·</span>  {{ $si->si_number }}
    </div>
    <div class="r">
      Generated {{ now()->format('d M Y · H:i') }}
    </div>
  </div>

</div>

</body>
</html>
