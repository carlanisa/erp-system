<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;

class MailTest extends Command
{
    protected $signature   = 'mail:test {to? : Recipient email — defaults to MAIL_FROM_ADDRESS}';
    protected $description = 'Send a test email to verify SMTP configuration is working.';

    public function handle(): int
    {
        $to = $this->argument('to') ?: config('mail.from.address');
        $from = config('mail.from.address');

        $this->info("Sending test email…");
        $this->line("  Mailer:   " . config('mail.default'));
        $this->line("  Host:     " . config('mail.mailers.smtp.host') . ':' . config('mail.mailers.smtp.port'));
        $this->line("  From:     {$from}");
        $this->line("  To:       {$to}");

        try {
            Mail::send([], [], function (Message $m) use ($to) {
                $m->to($to)
                  ->subject('[ERP Test] SMTP is working — ' . now()->format('d M Y H:i'))
                  ->html($this->htmlBody());
            });
            $this->newLine();
            $this->info('✓ Email sent successfully.');
            $this->line('  Check Mailpit UI: http://127.0.0.1:8025');
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('✗ Failed: ' . $e->getMessage());
            return self::FAILURE;
        }
    }

    private function htmlBody(): string
    {
        $time = now()->format('d M Y · H:i:s');
        $host = config('mail.mailers.smtp.host') . ':' . config('mail.mailers.smtp.port');
        $from = config('mail.from.address');
        return <<<HTML
<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1ea;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#2d2418;">
<div style="max-width:600px;margin:24px auto;background:#fff;border:1px solid #e7dcc6;border-radius:8px;overflow:hidden;">
  <div style="height:5px;background:#b3573a;"></div>
  <div style="padding:20px 24px;">
    <div style="font-size:11px;color:#8a7d68;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">
      CARLANISA <span style="color:#b3573a;">·</span> ERP SYSTEM <span style="color:#b3573a;">·</span> SMTP TEST
    </div>
    <h1 style="margin:8px 0 4px 0;font-size:22px;font-weight:800;">✓ SMTP is working</h1>
    <p style="font-size:13px;color:#5a4d3b;line-height:1.5;margin:0 0 14px 0;">
      Your ERP can now send emails to staff for <b>leave decisions</b> and <b>payslips</b>.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;background:#faf6ef;border:1px solid #e7dcc6;border-radius:4px;">
      <tr><td style="padding:8px 12px;color:#8a7d68;width:30%;">Sent at</td><td style="padding:8px 12px;font-weight:700;">$time</td></tr>
      <tr><td style="padding:8px 12px;color:#8a7d68;border-top:1px solid #ece4d3;">SMTP Host</td><td style="padding:8px 12px;font-family:monospace;border-top:1px solid #ece4d3;">$host</td></tr>
      <tr><td style="padding:8px 12px;color:#8a7d68;border-top:1px solid #ece4d3;">From</td><td style="padding:8px 12px;font-weight:700;border-top:1px solid #ece4d3;">$from</td></tr>
    </table>
    <p style="font-size:11px;color:#8a7d68;margin-top:16px;">
      This is an automated test message from the Carlanisa ERP System.
    </p>
  </div>
</div>
</body></html>
HTML;
    }
}
