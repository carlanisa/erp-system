<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>@yield('title', 'CARLANSIA SDN BHD')</title>
<style>
  @page { size: A4; margin: 0; }

  *           { box-sizing: border-box; }
  html, body  { margin: 0; padding: 0; }
  body        {
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 10.5px;
    color: #0f172a;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Page wrapper with margins ── */
  .page-frame { padding: 32px 36px 28px 36px; position: relative; }

  /* ── Top accent strip ── */
  .top-bar {
    height: 6px;
    background: #0f172a;
    border-bottom: 2px solid #0ea5e9;
  }

  /* ── Brand band ── */
  .brand-band {
    display: table;
    width: 100%;
    margin-bottom: 22px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .brand-left, .brand-right {
    display: table-cell;
    vertical-align: middle;
  }
  .brand-right { text-align: right; }

  .brand-text { display: inline-block; vertical-align: middle; }
  .brand-name {
    font-size: 17px; font-weight: 800; letter-spacing: 0.4px;
    color: #0f172a;
  }
  .brand-reg { font-size: 9px; color: #64748b; letter-spacing: 0.3px; margin-top: 1px; }

  .brand-meta { font-size: 9.5px; color: #475569; line-height: 1.55; }
  .brand-meta a { color: #0ea5e9; text-decoration: none; }

  /* ── Doc title row ── */
  .doc-row { display: table; width: 100%; margin-bottom: 18px; }
  .doc-row .l, .doc-row .r {
    display: table-cell; vertical-align: middle;
  }
  .doc-row .r { text-align: right; }

  .doc-title {
    font-size: 22px; font-weight: 800; color: #0f172a;
    letter-spacing: 1.5px; text-transform: uppercase;
    margin: 0;
  }
  .doc-sub {
    font-size: 9px; color: #64748b; letter-spacing: 1.2px;
    text-transform: uppercase; margin-top: 4px;
  }

  .doc-num-card {
    display: inline-block;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #0ea5e9;
    padding: 8px 14px;
    border-radius: 4px;
    text-align: left;
  }
  .doc-num-label {
    font-size: 8.5px; color: #64748b; letter-spacing: 1.5px;
    text-transform: uppercase; font-weight: 600;
  }
  .doc-num-value {
    font-size: 14px; color: #0f172a; font-weight: 800;
    letter-spacing: 0.4px; margin-top: 2px;
  }

  /* ── Status pill ── */
  .status-pill {
    display: inline-block;
    font-size: 8.5px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px;
    margin-top: 6px;
  }
  .status-paid      { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .status-partial   { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
  .status-unpaid    { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  .status-cancelled { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
  .status-issued    { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }

  /* ── Meta cards ── */
  .meta-grid {
    display: table; width: 100%;
    border-collapse: separate;
    border-spacing: 12px 0;
    margin: 0 -12px 18px -12px;
    width: calc(100% + 24px);
  }
  .meta-card {
    display: table-cell;
    width: 50%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 16px;
    vertical-align: top;
  }
  .meta-card.accent { border-left: 3px solid #0f172a; }
  .meta-card.accent-blue { border-left: 3px solid #0ea5e9; }

  .meta-h {
    font-size: 8.5px; color: #64748b; letter-spacing: 1.5px;
    text-transform: uppercase; font-weight: 700;
    padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 9px;
  }
  .meta-row {
    display: table; width: 100%;
    padding: 3px 0;
  }
  .meta-row .lbl, .meta-row .val {
    display: table-cell; vertical-align: top;
  }
  .meta-row .lbl {
    width: 40%;
    font-size: 9.5px; color: #64748b; font-weight: 600;
  }
  .meta-row .val {
    font-size: 10.5px; color: #0f172a; font-weight: 600;
  }

  /* ── Line items table ── */
  .lines {
    width: 100%; border-collapse: collapse;
    margin: 12px 0 8px 0;
    border: 1px solid #e2e8f0; border-radius: 6px;
    overflow: hidden;
  }
  .lines thead th {
    background: #0f172a; color: #fff;
    text-align: left; padding: 10px 12px;
    font-size: 9px; letter-spacing: 1px;
    text-transform: uppercase; font-weight: 700;
    border: none;
  }
  .lines thead th.amt { text-align: right; }
  .lines tbody td {
    padding: 11px 12px;
    vertical-align: top;
    border-bottom: 1px solid #f1f5f9;
    font-size: 10.5px;
  }
  .lines tbody tr:last-child td { border-bottom: none; }
  .lines tbody tr:nth-child(even) td { background: #fafbfc; }
  .lines tbody td.amt {
    text-align: right; white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .acct-parent {
    color: #64748b; font-size: 9px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 1px;
  }
  .acct-parent .pc { color: #94a3b8; font-weight: 500; }
  .acct-code { font-weight: 700; color: #0f172a; font-size: 10.5px; }
  .acct-name { color: #475569; font-size: 9.5px; margin-top: 1px; }

  .desc-main { white-space: pre-wrap; color: #0f172a; }

  /* ── Summary block (totals) ── */
  .summary-wrap {
    display: table; width: 100%;
    margin-top: 14px;
  }
  .summary-l, .summary-r {
    display: table-cell; vertical-align: top;
  }
  .summary-l { width: 60%; padding-right: 18px; }
  .summary-r { width: 40%; }

  .words-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #0ea5e9;
    padding: 10px 14px;
    border-radius: 6px;
  }
  .words-h {
    font-size: 8.5px; color: #64748b; letter-spacing: 1.5px;
    text-transform: uppercase; font-weight: 700;
  }
  .words-text { color: #0f172a; font-size: 10.5px; font-weight: 600; margin-top: 4px; }
  .words-curr { font-weight: 800; }

  .totals-table {
    width: 100%; border-collapse: collapse;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  .totals-table td {
    padding: 8px 14px;
    font-size: 10.5px;
  }
  .totals-table td.lbl { color: #64748b; font-weight: 600; }
  .totals-table td.val { text-align: right; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .totals-table tr.grand td { background: #0f172a; color: #fff; padding: 11px 14px; font-size: 11.5px; }
  .totals-table tr.grand td.lbl { color: #fff; letter-spacing: 1px; text-transform: uppercase; font-size: 9.5px; }
  .totals-table tr.grand td.val { color: #fff; font-size: 13px; }

  /* ── Notes ── */
  .notes {
    margin-top: 14px;
    padding: 10px 14px;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    background: #fff;
    font-size: 9.5px; color: #475569;
  }
  .notes b { color: #0f172a; }

  /* ── Signatures ── */
  .sigs {
    margin-top: 50px;
    width: 100%; border-collapse: separate; border-spacing: 16px 0;
  }
  .sigs td {
    width: 50%; vertical-align: top;
    padding: 0;
  }
  .sig-line {
    border-top: 1.2px solid #0f172a;
    padding-top: 6px;
  }
  .sig-label {
    font-size: 9px; color: #64748b;
    text-transform: uppercase; letter-spacing: 1.2px;
    font-weight: 700;
  }
  .sig-name { font-size: 10px; color: #0f172a; font-weight: 600; margin-top: 2px; }

  /* ── Footer bar ── */
  .footer {
    margin-top: 18px;
    padding: 10px 0 0 0;
    border-top: 1px solid #e2e8f0;
    font-size: 8.5px; color: #64748b;
    display: table;
    width: 100%;
  }
  .footer .l, .footer .r {
    display: table-cell; vertical-align: middle;
  }
  .footer .r { text-align: right; }
  .footer b { color: #0f172a; font-weight: 700; }

  /* spacer pushes summary/sigs near bottom on short docs */
  .flex-spacer { display: block; height: 1px; }

  /* ── Cancelled overlay ── */
  .cancelled-mark {
    position: fixed; top: 38%; left: 0; right: 0;
    text-align: center;
    font-size: 110px; font-weight: 800;
    color: rgba(220, 38, 38, 0.06);
    transform: rotate(-22deg);
    letter-spacing: 8px;
    z-index: 0;
  }
</style>
</head>
<body>

@if (!empty($isCancelled))
  <div class="cancelled-mark">CANCELLED</div>
@endif

<div class="top-bar"></div>

<div class="page-frame">

  {{-- ── Brand band ── --}}
  <div class="brand-band">
    <div class="brand-left">
      <div class="brand-text">
        <div class="brand-name">CARLANSIA SDN BHD</div>
        <div class="brand-reg">Reg. No. 201901044434  ·  Selangor, Malaysia</div>
      </div>
    </div>
    <div class="brand-right">
      <div class="brand-meta">
        E-17-02 Jalan Serai Wangi 16M/M<br>
        Shah Alam 40200, Selangor MY<br>
        <a href="mailto:hello@carlanisa.com">hello@carlanisa.com</a>
      </div>
    </div>
  </div>

  {{-- ── Doc title row ── --}}
  <div class="doc-row">
    <div class="l">
      <div class="doc-title">@yield('doc-title')</div>
      <div class="doc-sub">@yield('doc-sub', 'Official Document · CARLANISA SDN BHD')</div>
    </div>
    <div class="r">
      <div class="doc-num-card">
        <div class="doc-num-label">@yield('doc-num-label', 'Document No.')</div>
        <div class="doc-num-value">@yield('doc-num-value')</div>
      </div>
      <div>@yield('status-pill')</div>
    </div>
  </div>

  {{-- ── Meta cards (left + right) ── --}}
  <table class="meta-grid">
    <tr>
      <td class="meta-card accent">
        <div class="meta-h">@yield('meta-left-title', 'Counterparty')</div>
        @yield('meta-left')
      </td>
      <td class="meta-card accent-blue">
        <div class="meta-h">@yield('meta-right-title', 'Document Details')</div>
        @yield('meta-right')
      </td>
    </tr>
  </table>

  {{-- ── Lines table ── --}}
  <table class="lines">
    <thead>
      <tr>@yield('line-headers')</tr>
    </thead>
    <tbody>
      @yield('line-rows')
      <tr class="filler-row"><td colspan="@yield('col-count', 4)" style="height: @yield('filler-h', '180px'); background: transparent !important; border: none;"></td></tr>
    </tbody>
  </table>

  {{-- ── Summary (words + totals) ── --}}
  <div class="summary-wrap">
    <div class="summary-l">
      <div class="words-card">
        <div class="words-h">Amount in Words</div>
        <div class="words-text"><span class="words-curr">RINGGIT MALAYSIA</span> {{ strtoupper($amountInWords ?? '') }}</div>
      </div>
      @hasSection('notes')
        <div class="notes">@yield('notes')</div>
      @endif
    </div>
    <div class="summary-r">
      <table class="totals-table">
        @yield('totals-rows')
        <tr class="grand">
          <td class="lbl">@yield('grand-label', 'Grand Total (RM)')</td>
          <td class="val">@yield('total-amount')</td>
        </tr>
      </table>
    </div>
  </div>

  {{-- ── Signatures ── --}}
  <table class="sigs">
    <tr>
      <td>
        <div class="sig-line"></div>
        <div class="sig-label">@yield('sig-left', 'Approved By')</div>
        <div class="sig-name">@yield('sig-left-name', 'Name &amp; Signature')</div>
      </td>
      <td>
        <div class="sig-line"></div>
        <div class="sig-label">@yield('sig-right', 'Received By')</div>
        <div class="sig-name">@yield('sig-right-name', 'Name &amp; Signature')</div>
      </td>
    </tr>
  </table>

  {{-- ── Footer ── --}}
  <div class="footer">
    <div class="l">
      <b>CARLANSIA SDN BHD</b> · @yield('doc-title') · @yield('doc-num-value')
    </div>
    <div class="r">
      Generated {{ now()->format('d M Y · H:i') }}
    </div>
  </div>

</div>

</body>
</html>
