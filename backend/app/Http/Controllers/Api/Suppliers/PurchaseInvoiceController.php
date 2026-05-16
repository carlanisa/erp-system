<?php
namespace App\Http\Controllers\Api\Suppliers;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Suppliers\PurchaseInvoice;
use App\Models\Inventory\ProductVariant;
use App\Models\Inventory\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseInvoiceController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = PurchaseInvoice::with(['supplier','account','bankAccount','lines.account','payments.account'])
            ->when($request->search, fn($q,$s) =>
                $q->where('pi_number','ilike',"%$s%")
                  ->orWhere('supplier_invoice_no','ilike',"%$s%")
                  ->orWhere('reference','ilike',"%$s%")
                  ->orWhereHas('supplier', fn($q2) => $q2->where('name','ilike',"%$s%"))
            )
            ->when($request->supplier_id,  fn($q,$s) => $q->where('supplier_id', $s))
            ->when($request->status,       fn($q,$s) => $q->where('status', $s))
            ->when($request->branch_code,  fn($q,$s) => $q->where('branch_code', $s))
            ->when($request->get('cancelled') === 'true',  fn($q) => $q->where('is_cancelled', true))
            ->when($request->get('cancelled') === 'false', fn($q) => $q->where('is_cancelled', false))
            ->orderByDesc('date')->orderByDesc('id');

        $paginated = $q->paginate($request->integer('per_page', 20));

        $total = PurchaseInvoice::where('is_cancelled', false)->sum('amount');

        $data = $this->paginated($paginated);
        $responseData = json_decode($data->getContent(), true);
        $responseData['meta']['grand_total'] = (float) $total;
        return response()->json($responseData);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, true);

        $pi = DB::transaction(function () use ($data, $request) {
            $data['pi_number']   = $this->generateNumber();
            $data['branch_code'] = $data['branch_code'] ?? 'HQ';
            $data['created_by']  = $request->user()->id;

            $lines    = $data['lines']    ?? [];
            $payments = $data['payments'] ?? [];
            unset($data['lines'], $data['payments']);

            // Mirror PV/OR: account_id can be derived from first line if not provided
            if (empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'] ?? null;
            }

            $pi = PurchaseInvoice::create($data);

            foreach ($lines as $i => $line) {
                $pi->lines()->create([
                    'account_id'  => $line['account_id'] ?? null,
                    'item_code'   => $line['item_code']  ?? null,
                    'description' => $line['description'] ?? null,
                    'color'       => $line['color']      ?? null,
                    'size'        => $line['size']       ?? null,
                    'qty'         => $line['qty']        ?? 1,
                    'roll_count'  => $line['roll_count'] ?? 0,
                    'uom'         => $line['uom']        ?? 'UNIT',
                    'unit_cost'   => $line['unit_cost']  ?? 0,
                    'discount'    => $line['discount']   ?? 0,
                    'amount'      => $line['amount'],
                    'sort_order'  => $i,
                ]);
                // Increment product/variant stock for this SKU
                $this->applyStockDelta($line['item_code'] ?? null, (float) ($line['qty'] ?? 0));
            }

            $this->syncPayments($pi, $payments, $request->user()->id);
            return $pi;
        });

        return $this->success($pi->load(['supplier','account','bankAccount','lines.account','payments.account']), 'Purchase invoice created', 201);
    }

    public function show(PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        return $this->success($purchaseInvoice->load(['supplier','account','bankAccount','lines.account','payments.account','createdBy']));
    }

    public function update(Request $request, PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        if ($purchaseInvoice->is_cancelled) return $this->error('Cancelled invoice cannot be edited', 422);

        $data = $this->validatePayload($request, false);

        DB::transaction(function () use ($data, $purchaseInvoice, $request) {
            $lines    = $data['lines']    ?? null;
            $payments = array_key_exists('payments', $data) ? $data['payments'] : null;
            unset($data['lines'], $data['payments']);

            if (array_key_exists('account_id', $data) && empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'];
            }

            $purchaseInvoice->update($data);

            if ($lines !== null) {
                // Reverse OLD lines' stock impact before replacing
                foreach ($purchaseInvoice->lines as $oldLine) {
                    $this->applyStockDelta($oldLine->item_code, -1 * (float) $oldLine->qty);
                }
                $purchaseInvoice->lines()->delete();
                foreach ($lines as $i => $line) {
                    $purchaseInvoice->lines()->create([
                        'account_id'  => $line['account_id'] ?? null,
                        'item_code'   => $line['item_code']  ?? null,
                        'description' => $line['description'] ?? null,
                        'color'       => $line['color']      ?? null,
                        'size'        => $line['size']       ?? null,
                        'qty'         => $line['qty']        ?? 1,
                        'roll_count'  => $line['roll_count'] ?? 0,
                        'uom'         => $line['uom']        ?? 'UNIT',
                        'unit_cost'   => $line['unit_cost']  ?? 0,
                        'discount'    => $line['discount']   ?? 0,
                        'amount'      => $line['amount'],
                        'sort_order'  => $i,
                    ]);
                    // Apply NEW line's stock impact
                    $this->applyStockDelta($line['item_code'] ?? null, (float) ($line['qty'] ?? 0));
                }
            }

            if ($payments !== null) {
                $this->syncPayments($purchaseInvoice, $payments, $request->user()->id);
            }
        });

        return $this->success($purchaseInvoice->fresh(['supplier','account','bankAccount','lines.account','payments.account']), 'Updated');
    }

    public function destroy(PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        DB::transaction(function () use ($purchaseInvoice) {
            // Reverse stock impact before deleting
            foreach ($purchaseInvoice->lines as $line) {
                $this->applyStockDelta($line->item_code, -1 * (float) $line->qty);
            }
            $purchaseInvoice->delete();
        });
        return $this->success(null, 'Deleted');
    }

    /**
     * Increment / decrement product-variant or product stock by `qty` for a given SKU.
     * Tries ProductVariant.sku first (color/size variants like FAB-0001-BLUE), falls back to Product.sku.
     * Silently skips if no match is found (line might be a free-text item not tied to inventory).
     */
    private function applyStockDelta(?string $sku, float $qty): void
    {
        if (!$sku || $qty == 0.0) return;
        $variant = ProductVariant::where('sku', $sku)->first();
        if ($variant) {
            $variant->stock = max(0, ((float) $variant->stock) + $qty);
            $variant->save();
            // Also reflect on parent product's aggregate stock
            $product = $variant->product;
            if ($product) {
                $product->stock = max(0, $product->variants()->sum('stock'));
                $product->save();
            }
            return;
        }
        $product = Product::where('sku', $sku)->first();
        if ($product) {
            $product->stock = max(0, ((float) $product->stock) + $qty);
            $product->save();
        }
    }

    public function pdf(PurchaseInvoice $purchaseInvoice, \App\Services\PdfRenderer $renderer)
    {
        $pdf = $renderer->purchaseInvoice($purchaseInvoice);
        return $pdf->stream("{$purchaseInvoice->pi_number}.pdf");
    }

    public function cancel(PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        DB::transaction(function () use ($purchaseInvoice) {
            $willCancel = !$purchaseInvoice->is_cancelled;
            // Cancelling → reverse stock; restoring → re-apply
            $sign = $willCancel ? -1.0 : 1.0;
            foreach ($purchaseInvoice->lines as $line) {
                $this->applyStockDelta($line->item_code, $sign * (float) $line->qty);
            }
            $purchaseInvoice->update(['is_cancelled' => $willCancel]);
        });
        $msg = $purchaseInvoice->is_cancelled ? 'Invoice cancelled' : 'Invoice restored';
        return $this->success($purchaseInvoice, $msg);
    }

    private function validatePayload(Request $request, bool $isStore): array
    {
        $req = $isStore ? 'required' : 'sometimes';
        return $request->validate([
            'date'                => "$req|date",
            'due_date'            => 'nullable|date',
            'posting_date'        => 'nullable|date',
            'payment_date'        => 'nullable|date',
            'branch_code'         => 'nullable|string|max:20',
            'supplier_id'         => "$req|exists:suppliers,id",
            'supplier_invoice_no' => 'nullable|string|max:100',
            'account_id'          => 'nullable|exists:accounts,id',
            'bank_account_id'     => 'nullable|exists:accounts,id',
            'amount'              => "$req|numeric|min:0",
            'paid_amount'         => 'nullable|numeric|min:0',
            'bank_charges'        => 'nullable|numeric|min:0',
            'payment_method'      => "$req|in:cash,cheque,bank_transfer",
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
            'lines.*.unit_cost'           => 'nullable|numeric|min:0',
            'lines.*.discount'            => 'nullable|numeric|min:0',
            'lines.*.amount'              => 'required_with:lines|numeric|min:0',
            'payments'                    => 'nullable|array',
            'payments.*.payment_date'     => 'required_with:payments|date',
            'payments.*.amount'           => 'required_with:payments|numeric|min:0.01',
            'payments.*.paid_to'          => 'nullable|string|max:255',
            'payments.*.account_id'       => 'nullable|exists:accounts,id',
            'payments.*.reference'        => 'nullable|string|max:255',
            'payments.*.notes'            => 'nullable|string|max:255',
        ]);
    }

    private function syncPayments(PurchaseInvoice $pi, array $payments, ?int $userId): void
    {
        $supplier         = $pi->supplier()->first();
        $defaultPayee     = optional($supplier)->name;
        $defaultAccountId = optional($supplier)->account_id;     // SUP-XXXX account auto-tagged

        $pi->payments()->delete();
        foreach ($payments as $p) {
            $pi->payments()->create([
                'paid_to'      => !empty($p['paid_to']) ? $p['paid_to'] : $defaultPayee,
                'account_id'   => $p['account_id'] ?? $defaultAccountId,
                'payment_date' => $p['payment_date'],
                'amount'       => $p['amount'],
                'reference'    => $p['reference'] ?? null,
                'notes'        => $p['notes']     ?? null,
                'created_by'   => $userId,
            ]);
        }
        $sum  = (float) $pi->payments()->sum('amount');
        $last = $pi->payments()->max('payment_date');
        $pi->update(['paid_amount' => $sum, 'payment_date' => $last]);
    }

    private function generateNumber(): string
    {
        $last = PurchaseInvoice::orderByRaw("CAST(SUBSTRING(pi_number FROM 4) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->pi_number, 3)) + 1 : 1;
        $num  = 'PI-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (PurchaseInvoice::where('pi_number', $num)->exists()) { $next++; $num = 'PI-' . str_pad($next, 5, '0', STR_PAD_LEFT); }
        return $num;
    }
}
