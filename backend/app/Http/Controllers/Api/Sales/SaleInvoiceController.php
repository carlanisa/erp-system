<?php
namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Sales\SaleInvoice;
use App\Services\Sales\SaleInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleInvoiceController extends Controller
{
    use ApiResponse;

    public function __construct(private SaleInvoiceService $sales) {}

    public function index(Request $request): JsonResponse
    {
        $q = SaleInvoice::with(['customer','account','bankAccount','lines.account','payments.account'])
            ->when($request->search, fn($q,$s) =>
                $q->where('si_number','ilike',"%$s%")
                  ->orWhere('customer_invoice_no','ilike',"%$s%")
                  ->orWhere('reference','ilike',"%$s%")
                  ->orWhereHas('customer', fn($q2) => $q2->where('name','ilike',"%$s%"))
            )
            ->when($request->customer_id, fn($q,$s) => $q->where('customer_id', $s))
            ->when($request->status,      fn($q,$s) => $q->where('status', $s))
            ->when($request->source,      fn($q,$s) => $q->where('source', $s))
            ->when($request->branch_code, fn($q,$s) => $q->where('branch_code', $s))
            ->when($request->get('cancelled') === 'true',  fn($q) => $q->where('is_cancelled', true))
            ->when($request->get('cancelled') === 'false', fn($q) => $q->where('is_cancelled', false))
            ->orderByDesc('date')->orderByDesc('id');

        $paginated = $q->paginate($request->integer('per_page', 20));

        $total = SaleInvoice::where('is_cancelled', false)->sum('amount');

        $data = $this->paginated($paginated);
        $responseData = json_decode($data->getContent(), true);
        $responseData['meta']['grand_total'] = (float) $total;
        return response()->json($responseData);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, true);

        $lines    = $data['lines']    ?? [];
        $payments = $data['payments'] ?? [];
        unset($data['lines'], $data['payments']);

        $data['source']     = $data['source']     ?? 'erp';
        $data['created_by'] = $request->user()->id;

        $invoice = DB::transaction(function () use ($data, $lines, $payments, $request) {
            // Build through the shared service so numbering + stock deltas stay consistent with POS
            $invoice = $this->sales->createWithLines($data, $lines, null);

            // ERP-side multi-payment schedule (POS uses single payment via createWithLines, ERP supports many)
            $this->syncPayments($invoice, $payments, $request->user()->id);

            return $invoice;
        });

        return $this->success(
            $invoice->load(['customer','account','bankAccount','salesOrder','lines.account','payments.account']),
            'Sale invoice created',
            201
        );
    }

    public function show(SaleInvoice $saleInvoice): JsonResponse
    {
        return $this->success($saleInvoice->load([
            'customer','account','bankAccount','salesOrder',
            'lines.account','payments.account','createdBy',
        ]));
    }

    public function update(Request $request, SaleInvoice $saleInvoice): JsonResponse
    {
        if ($saleInvoice->is_cancelled) return $this->error('Cancelled invoice cannot be edited', 422);

        $data = $this->validatePayload($request, false);

        DB::transaction(function () use ($data, $saleInvoice, $request) {
            $lines    = $data['lines']    ?? null;
            $payments = array_key_exists('payments', $data) ? $data['payments'] : null;
            unset($data['lines'], $data['payments']);

            // If header didn't carry account_id, fall back to first line
            if (array_key_exists('account_id', $data) && empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $saleInvoice->update($data);

            if ($lines !== null) {
                // Reverse old line stock impact (sale was negative, restoring is positive)
                $this->sales->reverseStock($saleInvoice);
                $saleInvoice->lines()->delete();

                foreach ($lines as $i => $line) {
                    $saleInvoice->lines()->create([
                        'account_id'  => $line['account_id'] ?? null,
                        'item_code'   => $line['item_code']  ?? null,
                        'description' => $line['description'] ?? null,
                        'color'       => $line['color']      ?? null,
                        'size'        => $line['size']       ?? null,
                        'qty'         => $line['qty']        ?? 1,
                        'roll_count'  => $line['roll_count'] ?? 0,
                        'uom'         => $line['uom']        ?? 'UNIT',
                        'unit_price'  => $line['unit_price'] ?? 0,
                        'discount'    => $line['discount']   ?? 0,
                        'tax_rate'    => $line['tax_rate']   ?? 0,
                        'tax_amount'  => $line['tax_amount'] ?? 0,
                        'amount'      => $line['amount'],
                        'sort_order'  => $i,
                    ]);
                    // Apply NEW line stock impact (negative = sale)
                    $this->sales->applyStockDelta($line['item_code'] ?? null, -1 * (float) ($line['qty'] ?? 0));
                }
            }

            if ($payments !== null) {
                $this->syncPayments($saleInvoice, $payments, $request->user()->id);
            }
        });

        return $this->success(
            $saleInvoice->fresh(['customer','account','bankAccount','lines.account','payments.account']),
            'Updated'
        );
    }

    public function destroy(SaleInvoice $saleInvoice): JsonResponse
    {
        DB::transaction(function () use ($saleInvoice) {
            $this->sales->reverseStock($saleInvoice);   // put stock back
            $saleInvoice->delete();
        });
        return $this->success(null, 'Deleted');
    }

    public function cancel(SaleInvoice $saleInvoice): JsonResponse
    {
        DB::transaction(function () use ($saleInvoice) {
            $willCancel = !$saleInvoice->is_cancelled;
            // Cancelling → restore stock (sign +1); restoring → re-decrement (sign -1)
            $sign = $willCancel ? 1.0 : -1.0;
            foreach ($saleInvoice->lines as $line) {
                $this->sales->applyStockDelta($line->item_code, $sign * (float) $line->qty);
            }
            $saleInvoice->update(['is_cancelled' => $willCancel]);
        });
        $msg = $saleInvoice->is_cancelled ? 'Invoice cancelled' : 'Invoice restored';
        return $this->success($saleInvoice, $msg);
    }

    public function pdf(SaleInvoice $saleInvoice, \App\Services\PdfRenderer $renderer)
    {
        $pdf = $renderer->saleInvoice($saleInvoice);
        return $pdf->stream("{$saleInvoice->si_number}.pdf");
    }

    // ── Helpers ──────────────────────────────────────────────────

    private function validatePayload(Request $request, bool $isStore): array
    {
        $req = $isStore ? 'required' : 'sometimes';
        return $request->validate([
            'date'                => "$req|date",
            'due_date'            => 'nullable|date',
            'posting_date'        => 'nullable|date',
            'payment_date'        => 'nullable|date',
            'branch_code'         => 'nullable|string|max:20',
            'source'              => 'nullable|in:erp,pos,online',
            'customer_id'         => "$req|exists:customers,id",
            'walk_in_name'        => 'nullable|string|max:100',
            'sales_order_id'      => 'nullable|exists:sales_orders,id',
            'customer_invoice_no' => 'nullable|string|max:100',
            'account_id'          => 'nullable|exists:accounts,id',
            'bank_account_id'     => 'nullable|exists:accounts,id',
            'amount'              => "$req|numeric|min:0",
            'paid_amount'         => 'nullable|numeric|min:0',
            'change_amount'       => 'nullable|numeric|min:0',
            'bank_charges'        => 'nullable|numeric|min:0',
            'discount_total'      => 'nullable|numeric|min:0',
            'tax_total'           => 'nullable|numeric|min:0',
            'payment_method'      => "$req|in:cash,cheque,bank_transfer,card",
            'cheque_number'       => 'nullable|string',
            'reference'           => 'nullable|string',
            'description'         => 'nullable|string',
            'agent'               => 'nullable|string|max:100',
            'area'                => 'nullable|string|max:100',
            'status'              => 'in:draft,posted',
            'lines'                       => 'nullable|array',
            'lines.*.account_id'          => 'nullable|exists:accounts,id',
            'lines.*.item_code'           => 'nullable|string|max:100',
            'lines.*.description'         => 'nullable|string',
            'lines.*.color'               => 'nullable|string|max:100',
            'lines.*.size'                => 'nullable|string|max:100',
            'lines.*.qty'                 => 'nullable|numeric|min:0',
            'lines.*.roll_count'          => 'nullable|numeric|min:0',
            'lines.*.uom'                 => 'nullable|string|max:20',
            'lines.*.unit_price'          => 'nullable|numeric|min:0',
            'lines.*.discount'            => 'nullable|numeric|min:0',
            'lines.*.tax_rate'            => 'nullable|numeric|min:0|max:100',
            'lines.*.tax_amount'          => 'nullable|numeric|min:0',
            'lines.*.amount'              => 'required_with:lines|numeric|min:0',
            'payments'                    => 'nullable|array',
            'payments.*.payment_date'     => 'required_with:payments|date',
            'payments.*.amount'           => 'required_with:payments|numeric|min:0.01',
            'payments.*.tendered_amount'  => 'nullable|numeric|min:0',
            'payments.*.payment_method'   => 'nullable|in:cash,cheque,bank_transfer,card',
            'payments.*.received_from'    => 'nullable|string|max:255',
            'payments.*.account_id'       => 'nullable|exists:accounts,id',
            'payments.*.reference'        => 'nullable|string|max:255',
            'payments.*.notes'            => 'nullable|string|max:255',
        ]);
    }

    private function syncPayments(SaleInvoice $invoice, array $payments, ?int $userId): void
    {
        $customer         = $invoice->customer()->first();
        $defaultPayer     = optional($customer)->name ?: $invoice->walk_in_name;
        // Customer's own A/R account isn't always auto-tagged — leave null if unknown.

        $invoice->payments()->delete();
        foreach ($payments as $p) {
            $invoice->payments()->create([
                'received_from'   => !empty($p['received_from']) ? $p['received_from'] : $defaultPayer,
                'account_id'      => $p['account_id']      ?? $invoice->bank_account_id,
                'payment_date'    => $p['payment_date'],
                'amount'          => $p['amount'],
                'tendered_amount' => $p['tendered_amount'] ?? null,
                'payment_method'  => $p['payment_method']  ?? $invoice->payment_method,
                'reference'       => $p['reference']       ?? null,
                'notes'           => $p['notes']           ?? null,
                'created_by'      => $userId,
            ]);
        }
        $sum  = (float) $invoice->payments()->sum('amount');
        $last = $invoice->payments()->max('payment_date');
        $invoice->update(['paid_amount' => $sum, 'payment_date' => $last]);
    }
}
