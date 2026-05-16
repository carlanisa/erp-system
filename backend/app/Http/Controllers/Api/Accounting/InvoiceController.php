<?php

namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Accounting\Invoice;
use App\Services\Accounting\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    use ApiResponse;

    public function __construct(private InvoiceService $invoiceService) {}

    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with('customer', 'items')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, fn($q) => $q->where('number', 'like', "%{$request->search}%")
                ->orWhereHas('customer', fn($q2) => $q2->where('name', 'like', "%{$request->search}%")))
            ->latest()
            ->paginate(20);

        return $this->paginated($invoices);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'date'        => 'required|date',
            'due_date'    => 'required|date|after_or_equal:date',
            'notes'       => 'nullable|string',
            'items'       => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.tax_rate'    => 'nullable|numeric|min:0|max:100',
        ]);

        $invoice = $this->invoiceService->create($data);
        return $this->success($invoice->load('customer', 'items'), 'Invoice created', 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return $this->success($invoice->load('customer', 'items', 'payments'));
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'paid') {
            return $this->error('Cannot edit a paid invoice', 422);
        }

        $data = $request->validate([
            'due_date' => 'sometimes|date',
            'notes'    => 'nullable|string',
            'status'   => 'sometimes|in:draft,sent,cancelled',
        ]);

        $invoice->update($data);
        return $this->success($invoice->load('customer', 'items'), 'Invoice updated');
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'paid') {
            return $this->error('Cannot delete a paid invoice', 422);
        }
        $invoice->items()->delete();
        $invoice->delete();
        return $this->success(null, 'Invoice deleted');
    }

    public function markAsSent(Invoice $invoice): JsonResponse
    {
        $invoice->update(['status' => 'sent']);
        return $this->success($invoice, 'Invoice marked as sent');
    }
}
