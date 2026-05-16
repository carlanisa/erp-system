{{-- Shared email styles — inlined into each Leave email --}}
<style>
  body { margin: 0; padding: 0; background: #f4f1ea; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #2d2418; }
  .wrap { max-width: 640px; margin: 24px auto; background: #ffffff; border: 1px solid #e7dcc6; border-radius: 8px; overflow: hidden; }
  .top-bar { background: #b3573a; height: 5px; }
  .erp-badge { padding: 18px 24px 0 24px; }
  .erp-badge .crumbs { font-size: 11px; color: #8a7d68; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; }
  .erp-badge .crumbs .accent { color: #b3573a; }
  .erp-badge .auto-line { font-size: 12px; color: #5a4d3b; margin-top: 6px; }
  .erp-badge .auto-line b { color: #2d2418; }

  h1.title { padding: 4px 24px 6px 24px; margin: 0; font-size: 22px; color: #2d2418; font-weight: 800; letter-spacing: 0.5px; }
  .subtitle { padding: 0 24px 18px 24px; font-size: 12px; color: #8a7d68; }

  .body { padding: 0 24px 24px 24px; }

  /* Status pills */
  .pill { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; }
  .pill-pending  { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
  .pill-approved { background: #dcf5e3; color: #1b6b34; border-color: #95dbab; }
  .pill-rejected { background: #fde2e2; color: #9b1c1c; border-color: #fca5a5; }
  .pill-emergency{ background: #fde2e2; color: #9b1c1c; border-color: #fca5a5; margin-left: 6px; }
  .pill-public   { background: #ede9fe; color: #5b21b6; border-color: #c4b5fd; margin-left: 6px; }

  /* Form-style data card */
  .form-card { border: 1px solid #e7dcc6; border-radius: 6px; margin-top: 14px; background: #faf6ef; overflow: hidden; }
  .form-card-h { background: #b3573a; color: #ffffff; padding: 9px 14px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
  .form-card-h.alt { background: #2d2418; }
  .form-grid { width: 100%; border-collapse: collapse; }
  .form-grid td { padding: 9px 14px; border-bottom: 1px solid #ece4d3; vertical-align: top; font-size: 13px; }
  .form-grid tr:last-child td { border-bottom: none; }
  .form-grid td.lbl { width: 40%; color: #8a7d68; text-transform: uppercase; letter-spacing: 0.6px; font-size: 11px; font-weight: 700; }
  .form-grid td.val { color: #2d2418; font-weight: 700; }

  .reason-box { padding: 12px 14px; background: #ffffff; border-top: 1px solid #ece4d3; font-size: 13px; color: #2d2418; line-height: 1.55; white-space: pre-wrap; }
  .reason-box .h { display: block; font-size: 11px; color: #8a7d68; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px; }

  .cta { margin-top: 18px; text-align: center; }
  .cta a { display: inline-block; background: #b3573a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }

  .footer { padding: 14px 24px; border-top: 1px solid #ece4d3; background: #faf6ef; font-size: 11px; color: #8a7d68; }
  .footer b { color: #2d2418; }
  .footer .accent { color: #b3573a; }
</style>
