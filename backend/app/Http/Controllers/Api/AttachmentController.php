<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttachmentController extends Controller
{
    use ApiResponse;

    /**
     * Map of safe attachable types (string keys → fully-qualified model classes).
     * Prevents arbitrary class instantiation from request payload.
     */
    private const TYPES = [
        'purchase_invoice'  => \App\Models\Suppliers\PurchaseInvoice::class,
        'supplier'          => \App\Models\Suppliers\Supplier::class,
        'payment_voucher'   => \App\Models\Accounting\PaymentVoucher::class,
        'official_receipt'  => \App\Models\Accounting\OfficialReceipt::class,
        'ap_deposit'        => \App\Models\Accounting\ApDeposit::class,
        'ar_deposit'        => \App\Models\Accounting\ArDeposit::class,
        'journal_entry'     => \App\Models\Accounting\JournalEntry::class,
        'employee'          => \App\Models\HRM\Employee::class,
    ];

    /**
     * GET /api/attachments?type=purchase_invoice&id=2
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:' . implode(',', array_keys(self::TYPES)),
            'id'   => 'required|integer',
        ]);

        $files = Attachment::with('uploadedBy:id,name,email')
            ->where('attachable_type', self::TYPES[$request->type])
            ->where('attachable_id', $request->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn($a) => $this->formatAttachment($a));

        return $this->success($files);
    }

    /**
     * POST /api/attachments
     * multipart/form-data: type, id, file, label (optional)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type'  => 'required|in:' . implode(',', array_keys(self::TYPES)),
            'id'    => 'required|integer',
            'file'  => 'required|file|max:20480',                    // 20 MB max
            'label' => 'nullable|string|max:255',
        ]);

        $cls = self::TYPES[$request->type];
        // Confirm the parent record exists
        $cls::findOrFail($request->id);

        $file       = $request->file('file');
        $folder     = 'attachments/' . now()->format('Y/m');
        $stored     = $file->store($folder, 'public');
        $original   = $file->getClientOriginalName();

        $att = Attachment::create([
            'attachable_type'   => $cls,
            'attachable_id'     => $request->id,
            'original_filename' => $original,
            'stored_path'       => $stored,
            'mime_type'         => $file->getMimeType(),
            'size_bytes'        => $file->getSize(),
            'label'             => $request->label,
            'uploaded_by'       => $request->user()?->id,
        ]);

        return $this->success($this->formatAttachment($att->load('uploadedBy:id,name,email')), 'File uploaded', 201);
    }

    public function download(Attachment $attachment): BinaryFileResponse
    {
        $path = Storage::disk('public')->path($attachment->stored_path);
        return response()->download($path, $attachment->original_filename);
    }

    public function destroy(Attachment $attachment): JsonResponse
    {
        Storage::disk('public')->delete($attachment->stored_path);
        $attachment->delete();
        return $this->success(null, 'File deleted');
    }

    private function formatAttachment(Attachment $a): array
    {
        return [
            'id'                => $a->id,
            'original_filename' => $a->original_filename,
            'mime_type'         => $a->mime_type,
            'size_bytes'        => $a->size_bytes,
            'label'             => $a->label,
            'url'               => Storage::disk('public')->url($a->stored_path),
            'download_url'      => '/api/attachments/' . $a->id . '/download',
            'uploaded_by'       => $a->uploadedBy ? ['id' => $a->uploadedBy->id, 'name' => $a->uploadedBy->name] : null,
            'created_at'        => $a->created_at,
        ];
    }
}
