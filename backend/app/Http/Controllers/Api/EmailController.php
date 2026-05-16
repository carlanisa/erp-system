<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Attachment;
use App\Models\EmailSend;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class EmailController extends Controller
{
    use ApiResponse;

    /**
     * Whitelisted "related" types so we don't allow arbitrary class instantiation
     * from the request payload.
     */
    private const RELATED_TYPES = [
        'purchase_invoice'  => \App\Models\Suppliers\PurchaseInvoice::class,
        'payment_voucher'   => \App\Models\Accounting\PaymentVoucher::class,
        'official_receipt'  => \App\Models\Accounting\OfficialReceipt::class,
        'ap_deposit'        => \App\Models\Accounting\ApDeposit::class,
        'ar_deposit'        => \App\Models\Accounting\ArDeposit::class,
        'journal_entry'     => \App\Models\Accounting\JournalEntry::class,
        'crm_invoice'       => \App\Models\CRM\CrmInvoice::class,
    ];

    /**
     * POST /api/email/send
     *
     * Body:
     *  - related_type   (string, one of the keys in RELATED_TYPES)
     *  - related_id     (int)
     *  - to             (string|array of email addresses)
     *  - cc, bcc        (optional)
     *  - subject        (string)
     *  - body           (string, plain or simple text)
     *  - attachment_ids (array of Attachment ids — included as file attachments)
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'related_type'   => 'required|in:' . implode(',', array_keys(self::RELATED_TYPES)),
            'related_id'     => 'required|integer',
            'to'             => 'required',
            'cc'             => 'nullable',
            'bcc'            => 'nullable',
            'subject'        => 'required|string|max:255',
            'body'           => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'integer|exists:attachments,id',
            'include_pdf'    => 'nullable|boolean',          // auto-generate document PDF and attach
        ]);

        $cls    = self::RELATED_TYPES[$data['related_type']];
        $record = $cls::findOrFail($data['related_id']);     // confirm the parent record exists

        $toList  = $this->normaliseEmails($data['to']);
        $ccList  = $this->normaliseEmails($data['cc']  ?? []);
        $bccList = $this->normaliseEmails($data['bcc'] ?? []);

        if (empty($toList)) {
            return $this->error('At least one recipient is required in "To"', 422);
        }

        // Look up the attachment files
        $attIds  = $data['attachment_ids'] ?? [];
        $files   = Attachment::whereIn('id', $attIds)->get();

        // Pre-create the audit row in 'queued' state so we always have a record even if mail throws
        $auditRow = EmailSend::create([
            'related_type'   => $cls,
            'related_id'     => $data['related_id'],
            'to_addresses'   => implode(', ', $toList),
            'cc_addresses'   => $ccList  ? implode(', ', $ccList)  : null,
            'bcc_addresses'  => $bccList ? implode(', ', $bccList) : null,
            'subject'        => $data['subject'],
            'body'           => $data['body'] ?? '',
            'attachment_ids' => $attIds,
            'status'         => 'queued',
            'sent_by'        => $request->user()?->id,
        ]);

        // Optionally generate the document PDF and attach it inline
        $generatedPdf = null;
        if (!empty($data['include_pdf'])) {
            $generatedPdf = $this->generateDocumentPdf($data['related_type'], $record);
        }

        try {
            Mail::raw($data['body'] ?? '', function ($message) use ($data, $toList, $ccList, $bccList, $files, $generatedPdf) {
                $message->to($toList);
                if ($ccList)  $message->cc($ccList);
                if ($bccList) $message->bcc($bccList);
                $message->subject($data['subject']);
                foreach ($files as $f) {
                    $path = Storage::disk('public')->path($f->stored_path);
                    if (file_exists($path)) {
                        $message->attach($path, [
                            'as'   => $f->original_filename,
                            'mime' => $f->mime_type ?? 'application/octet-stream',
                        ]);
                    }
                }
                if ($generatedPdf) {
                    $message->attachData($generatedPdf['data'], $generatedPdf['filename'], ['mime' => 'application/pdf']);
                }
            });

            $auditRow->update(['status' => 'sent', 'sent_at' => now()]);
            return $this->success(['email_id' => $auditRow->id, 'status' => 'sent'], 'Email sent');
        } catch (\Throwable $e) {
            Log::error('Email send failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            $auditRow->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            return $this->error('Email send failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/email/batch-send
     * Sends a single email with multiple records' PDFs attached (e.g. quarterly audit submission).
     */
    public function batchSend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'related_type' => 'required|in:' . implode(',', array_keys(self::RELATED_TYPES)),
            'related_ids'  => 'required|array|min:1',
            'related_ids.*'=> 'integer',
            'to'           => 'required',
            'cc'           => 'nullable',
            'bcc'          => 'nullable',
            'subject'      => 'required|string|max:255',
            'body'         => 'nullable|string',
            'include_pdf'  => 'nullable|boolean',
            'include_attachments' => 'nullable|boolean',  // also include each record's external docs
        ]);

        $cls = self::RELATED_TYPES[$data['related_type']];
        $records = $cls::whereIn('id', $data['related_ids'])->get();
        if ($records->isEmpty()) return $this->error('No records matched', 422);

        $toList  = $this->normaliseEmails($data['to']);
        $ccList  = $this->normaliseEmails($data['cc']  ?? []);
        $bccList = $this->normaliseEmails($data['bcc'] ?? []);
        if (empty($toList)) return $this->error('At least one recipient is required', 422);

        // Pre-generate all PDFs and collect external attachments
        $pdfs        = [];
        $extFiles    = [];
        foreach ($records as $rec) {
            if (!empty($data['include_pdf'])) {
                $pdf = $this->generateDocumentPdf($data['related_type'], $rec);
                if ($pdf) $pdfs[] = $pdf;
            }
            if (!empty($data['include_attachments'])) {
                $more = \App\Models\Attachment::where('attachable_type', $cls)
                    ->where('attachable_id', $rec->id)->get();
                foreach ($more as $f) $extFiles[] = $f;
            }
        }

        $audit = \App\Models\EmailSend::create([
            'related_type'   => $cls,
            'related_id'     => $records->first()->id,        // pivot record (first in batch)
            'to_addresses'   => implode(', ', $toList),
            'cc_addresses'   => $ccList ? implode(', ', $ccList) : null,
            'bcc_addresses'  => $bccList ? implode(', ', $bccList) : null,
            'subject'        => '[BATCH ' . $records->count() . '] ' . $data['subject'],
            'body'           => $data['body'] ?? '',
            'attachment_ids' => collect($extFiles)->pluck('id')->all(),
            'status'         => 'queued',
            'sent_by'        => $request->user()?->id,
        ]);

        try {
            Mail::raw($data['body'] ?? '', function ($message) use ($data, $toList, $ccList, $bccList, $pdfs, $extFiles) {
                $message->to($toList);
                if ($ccList)  $message->cc($ccList);
                if ($bccList) $message->bcc($bccList);
                $message->subject($data['subject']);
                foreach ($pdfs as $p) {
                    $message->attachData($p['data'], $p['filename'], ['mime' => 'application/pdf']);
                }
                foreach ($extFiles as $f) {
                    $path = Storage::disk('public')->path($f->stored_path);
                    if (file_exists($path)) {
                        $message->attach($path, [
                            'as'   => $f->original_filename,
                            'mime' => $f->mime_type ?? 'application/octet-stream',
                        ]);
                    }
                }
            });
            $audit->update(['status' => 'sent', 'sent_at' => now()]);
            return $this->success([
                'email_id'     => $audit->id,
                'status'       => 'sent',
                'records_sent' => $records->count(),
                'pdfs'         => count($pdfs),
                'attachments'  => count($extFiles),
            ], "Batch email sent ({$records->count()} records)");
        } catch (\Throwable $e) {
            Log::error('Batch email send failed', ['error' => $e->getMessage()]);
            $audit->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            return $this->error('Batch send failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/email/history?type=purchase_invoice&id=2
     */
    public function history(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:' . implode(',', array_keys(self::RELATED_TYPES)),
            'id'   => 'required|integer',
        ]);

        $rows = EmailSend::with('sentBy:id,name,email')
            ->where('related_type', self::RELATED_TYPES[$request->type])
            ->where('related_id', $request->id)
            ->orderByDesc('id')
            ->get();

        return $this->success($rows);
    }

    /**
     * Auto-generate a system PDF for the given record (PI / PV).
     * Returns ['data' => binary string, 'filename' => 'XYZ.pdf'] or null if not supported.
     */
    private function generateDocumentPdf(string $type, $record): ?array
    {
        $renderer = app(\App\Services\PdfRenderer::class);
        try {
            if ($type === 'purchase_invoice') {
                return ['data' => $renderer->purchaseInvoice($record)->output(), 'filename' => $record->pi_number . '.pdf'];
            }
            if ($type === 'payment_voucher') {
                return ['data' => $renderer->paymentVoucher($record)->output(), 'filename' => $record->pv_number . '.pdf'];
            }
            if ($type === 'official_receipt') {
                return ['data' => $renderer->officialReceipt($record)->output(), 'filename' => $record->or_number . '.pdf'];
            }
            if ($type === 'crm_invoice') {
                return ['data' => $renderer->crmInvoice($record)->output(), 'filename' => $record->invoice_no . '.pdf'];
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('PDF generation skipped', ['error' => $e->getMessage()]);
        }
        return null;
    }

    /** Accept either "a@b.com, c@d.com" or ["a@b.com","c@d.com"]; return clean array. */
    private function normaliseEmails($raw): array
    {
        if (is_array($raw)) {
            $list = $raw;
        } else if (is_string($raw)) {
            $list = preg_split('/[,;\s]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
        } else {
            $list = [];
        }
        return array_values(array_filter(array_map('trim', $list), fn($e) => filter_var($e, FILTER_VALIDATE_EMAIL)));
    }
}
