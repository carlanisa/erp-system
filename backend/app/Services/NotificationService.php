<?php

namespace App\Services;

use App\Models\HRM\Employee;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Unified notification fan-out: in-app row + email + push (FCM stub).
 * Reuses LeaveMailer pattern at a lower level.
 */
class NotificationService
{
    public function __construct(private FcmPusher $pusher)
    {
    }

    /**
     * Send a notification to an employee on all enabled channels.
     */
    public function send(Employee $employee, string $type, string $title, string $body = '', ?string $link = null, array $payload = []): void
    {
        $prefs = $employee->preferences;

        // 1) In-app (always)
        Notification::create([
            'employee_id' => $employee->id,
            'type'        => $type,
            'title'       => $title,
            'body'        => $body,
            'link'        => $link,
            'channel'     => 'in_app',
            'payload'     => $payload,
        ]);

        // 2) Email
        if (!$prefs || $prefs->email_notifications) {
            $this->sendEmail($employee, $title, $body, $link);
        }

        // 3) Push
        if ((!$prefs || $prefs->push_notifications) && $prefs?->push_token) {
            $this->pusher->push($prefs->push_token, $title, $body, $payload);
            Notification::create([
                'employee_id' => $employee->id,
                'type'        => $type,
                'title'       => $title,
                'body'        => $body,
                'link'        => $link,
                'channel'     => 'push',
                'payload'     => $payload,
            ]);
        }
    }

    private function sendEmail(Employee $employee, string $title, string $body, ?string $link): void
    {
        if (!$employee->email) return;

        try {
            Mail::raw(
                $body . ($link ? "\n\nLink: " . $link : ''),
                function ($m) use ($employee, $title) {
                    $m->to($employee->email, $employee->name)->subject($title);
                }
            );

            Notification::create([
                'employee_id' => $employee->id,
                'type'        => 'email',
                'title'       => $title,
                'body'        => $body,
                'link'        => $link,
                'channel'     => 'email',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Notification email failed', ['err' => $e->getMessage(), 'emp' => $employee->id]);
        }
    }
}
