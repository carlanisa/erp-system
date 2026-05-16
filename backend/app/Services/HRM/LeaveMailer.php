<?php

namespace App\Services\HRM;

use App\Models\HRM\LeaveRequest;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Leave-request email notifications.
 *
 * Uses HTML Blade views (resources/views/emails/leave-*) so the
 * recipient sees a properly-formatted "Leave Application Form"
 * — not a plain-text dump.
 *
 * MAIL_MAILER=log writes the full HTML to storage/logs/laravel.log
 * which is fine for development. In production set MAIL_MAILER=smtp.
 */
class LeaveMailer
{
    /**
     * Notify HR + send a copy/confirmation to the employee that the
     * Leave Application Form has been submitted.
     */
    public function submitted(LeaveRequest $leave, ?string $hrEmail = null): bool
    {
        $leave->loadMissing('employee', 'leaveType');
        $emp     = $leave->employee;
        $hrEmail = $hrEmail
            ?: env('HR_EMAIL')
            ?: config('mail.from.address')
            ?: 'admin@carlanisa.com';

        $sentAny = false;

        // ── HR copy ──
        $hrSubject = sprintf(
            '[ERP] Leave Application Form — %s (%s) — %s',
            $emp->name,
            $emp->employee_code,
            $leave->from_date->format('d M Y')
        );
        try {
            Mail::send('emails.leave-submitted-hr', ['leave' => $leave], function (Message $m) use ($hrEmail, $hrSubject, $emp) {
                $m->to($hrEmail)->subject($hrSubject);
                if ($emp->email) {
                    $m->replyTo($emp->email, $emp->name);
                }
            });
            $sentAny = true;
        } catch (\Throwable $e) {
            Log::error('Leave HR email failed', ['err' => $e->getMessage(), 'leave_id' => $leave->id]);
        }

        // ── Employee confirmation ──
        if ($emp->email) {
            $confirmSubject = sprintf(
                '✅ Your Leave Application Form has been received — %s',
                $leave->from_date->format('d M Y')
            );
            try {
                Mail::send('emails.leave-confirmation-employee', ['leave' => $leave], function (Message $m) use ($emp, $confirmSubject) {
                    $m->to($emp->email, $emp->name)->subject($confirmSubject);
                });
                $sentAny = true;
            } catch (\Throwable $e) {
                Log::error('Leave employee confirmation email failed', ['err' => $e->getMessage(), 'leave_id' => $leave->id]);
            }
        }

        if ($sentAny) {
            $leave->update(['email_sent_at' => now()]);
        }

        return $sentAny;
    }

    /**
     * Notify employee that leave has been approved.
     */
    public function approved(LeaveRequest $leave): bool
    {
        return $this->sendDecision($leave, 'Approved');
    }

    /**
     * Notify employee that leave has been rejected.
     */
    public function rejected(LeaveRequest $leave): bool
    {
        return $this->sendDecision($leave, 'Rejected');
    }

    private function sendDecision(LeaveRequest $leave, string $decisionWord): bool
    {
        $leave->loadMissing('employee', 'leaveType');
        $emp = $leave->employee;
        if (!$emp?->email) return false;

        $subject = sprintf(
            '[ERP] Leave %s — %s to %s',
            $decisionWord,
            $leave->from_date->format('d M Y'),
            $leave->to_date->format('d M Y'),
        );

        try {
            Mail::send('emails.leave-decision', ['leave' => $leave], function (Message $m) use ($emp, $subject) {
                $m->to($emp->email, $emp->name)->subject($subject);
            });
            $leave->update(['email_sent_at' => now()]);
            return true;
        } catch (\Throwable $e) {
            Log::error('Leave decision email failed', ['err' => $e->getMessage(), 'leave_id' => $leave->id, 'decision' => $decisionWord]);
            return false;
        }
    }
}
