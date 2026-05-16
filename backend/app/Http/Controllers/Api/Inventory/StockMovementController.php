<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\StockMovement;
use App\Models\Inventory\StockMovementLine;
use App\Models\Inventory\StockItem;
use App\Models\Inventory\Product;
use App\Models\Inventory\BomHeader;
use App\Models\Inventory\Tailor;
use App\Models\Suppliers\Supplier;
use App\Models\Suppliers\PurchaseInvoice;
use App\Models\Accounting\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = StockMovement::with(['fromLocation','toLocation','tailor','product','bom','lines.stockItem','lines.product','createdBy'])
            ->when($request->type, fn($q,$t) => $q->where('type', $t))
            ->when($request->tailor_id, fn($q,$t) => $q->where('tailor_id', $t))
            ->when($request->date_from, fn($q,$d) => $q->where('date', '>=', $d))
            ->when($request->date_to,   fn($q,$d) => $q->where('date', '<=', $d))
            ->when($request->search, fn($q,$s) =>
                $q->where('movement_no','ilike',"%$s%")->orWhere('reference','ilike',"%$s%")
            )
            ->orderByDesc('date')->orderByDesc('id');
        return $this->success($q->get());
    }

    public function show(StockMovement $stockMovement): JsonResponse
    {
        return $this->success($stockMovement->load([
            'fromLocation','toLocation','tailor','product','bom.lines.stockItem',
            'lines.stockItem','lines.product','createdBy',
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $movement = DB::transaction(function () use ($data, $request) {
            $movement = StockMovement::create([
                'movement_no'      => $this->nextNumber($data['type']),
                'type'             => $data['type'],
                'date'             => $data['date'],
                'from_location_id' => $data['from_location_id'] ?? null,
                'to_location_id'   => $data['to_location_id'] ?? null,
                'tailor_id'        => $data['tailor_id'] ?? null,
                'product_id'       => $data['product_id'] ?? null,
                'bom_id'           => $data['bom_id'] ?? null,
                'reference'        => $data['reference'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'status'           => $data['status'] ?? 'posted',
                'created_by'       => $request->user()->id,
            ]);

            $lines = $this->expandBomConsumption($data, $movement);

            $totalQty = 0; $totalCost = 0;
            foreach ($lines as $i => $ln) {
                $tot = (float) $ln['qty'] * (float) ($ln['unit_cost'] ?? 0);
                $movement->lines()->create([
                    'stock_item_id' => $ln['stock_item_id'] ?? null,
                    'product_id'    => $ln['product_id'] ?? null,
                    'item_code'     => $ln['item_code']   ?? null,
                    'description'   => $ln['description'] ?? null,
                    'color'         => $ln['color']       ?? null,
                    'size'          => $ln['size']        ?? null,
                    'qty'           => $ln['qty'],
                    'uom'           => $ln['uom'] ?? null,
                    'unit_cost'     => $ln['unit_cost'] ?? 0,
                    'total_cost'    => $tot,
                    'notes'         => $ln['notes'] ?? null,
                    'sort_order'    => $i,
                ]);
                // for totals, only count "primary" qty (product lines for receive_tailor, otherwise everything)
                $isPrimary = $movement->type !== 'receive_tailor' || ($ln['product_id'] ?? null);
                if ($isPrimary) {
                    $totalQty  += (float) $ln['qty'];
                    $totalCost += $tot;
                }
            }
            $movement->update(['total_qty' => $totalQty, 'total_cost' => $totalCost]);

            $this->applyStockEffects($movement->fresh('lines'));

            return $movement;
        });

        return $this->success($movement->fresh(['lines.stockItem','lines.product','fromLocation','toLocation','tailor','product','bom.lines.stockItem']), 'Movement posted');
    }

    /**
     * For receive_tailor: caller sends product line(s); we auto-expand BOM material lines
     * into shadow consumption lines (negative-direction stock_item lines).
     * Returns the final list of lines to persist.
     */
    private function expandBomConsumption(array $data, StockMovement $movement): array
    {
        $lines = $data['lines'] ?? [];
        if ($data['type'] !== 'receive_tailor' || empty($data['bom_id'])) {
            return $lines;
        }

        $bom = BomHeader::with('lines.stockItem')->find($data['bom_id']);
        if (!$bom || $bom->lines->isEmpty()) return $lines;

        $outputQty = (float) ($bom->output_qty ?: 1);

        // sum incoming product qty for this product (in case multi-line)
        $productQty = 0;
        foreach ($lines as $ln) {
            if (!empty($ln['product_id']) && (int) $ln['product_id'] === (int) $bom->product_id) {
                $productQty += (float) $ln['qty'];
            }
        }
        if ($productQty <= 0) return $lines;

        $multiplier = $productQty / $outputQty;

        // append consumption lines for material kind only
        foreach ($bom->lines as $bl) {
            if ($bl->kind !== 'material' || !$bl->stock_item_id) continue;
            $lines[] = [
                'stock_item_id' => $bl->stock_item_id,
                'product_id'    => null,
                'qty'           => round((float) $bl->qty * $multiplier, 3),
                'uom'           => $bl->uom ?? optional($bl->stockItem)->uom,
                'unit_cost'     => optional($bl->stockItem)->unit_cost ?? 0,
                'notes'         => 'Consumed per BOM ' . $bom->bom_number . ' (auto)',
            ];
        }

        return $lines;
    }

    public function update(Request $request, StockMovement $stockMovement): JsonResponse
    {
        if ($stockMovement->is_cancelled) return $this->error('Cancelled movements cannot be edited', 422);
        $data = $this->validatePayload($request);

        $movement = DB::transaction(function () use ($data, $stockMovement) {
            // reverse current stock effects, then re-apply with new data
            $this->reverseStockEffects($stockMovement);
            $stockMovement->lines()->delete();

            $stockMovement->update([
                'type'             => $data['type'],
                'date'             => $data['date'],
                'from_location_id' => $data['from_location_id'] ?? null,
                'to_location_id'   => $data['to_location_id'] ?? null,
                'tailor_id'        => $data['tailor_id'] ?? null,
                'product_id'       => $data['product_id'] ?? null,
                'bom_id'           => $data['bom_id'] ?? null,
                'reference'        => $data['reference'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'status'           => $data['status'] ?? 'posted',
            ]);

            $expanded = $this->expandBomConsumption($data, $stockMovement);

            $totalQty = 0; $totalCost = 0;
            foreach ($expanded as $i => $ln) {
                $tot = (float) $ln['qty'] * (float) ($ln['unit_cost'] ?? 0);
                $stockMovement->lines()->create([
                    'stock_item_id' => $ln['stock_item_id'] ?? null,
                    'product_id'    => $ln['product_id']    ?? null,
                    'qty'           => $ln['qty'],
                    'uom'           => $ln['uom']           ?? null,
                    'unit_cost'     => $ln['unit_cost']     ?? 0,
                    'total_cost'    => $tot,
                    'notes'         => $ln['notes']         ?? null,
                    'sort_order'    => $i,
                ]);
                $isPrimary = $stockMovement->type !== 'receive_tailor' || ($ln['product_id'] ?? null);
                if ($isPrimary) {
                    $totalQty  += (float) $ln['qty'];
                    $totalCost += $tot;
                }
            }
            $stockMovement->update(['total_qty' => $totalQty, 'total_cost' => $totalCost]);
            $this->applyStockEffects($stockMovement->fresh('lines'));

            return $stockMovement;
        });

        return $this->success($movement->fresh(['lines.stockItem','lines.product','fromLocation','toLocation','tailor','product']), 'Updated');
    }

    public function destroy(StockMovement $stockMovement): JsonResponse
    {
        DB::transaction(function () use ($stockMovement) {
            $this->reverseStockEffects($stockMovement);
            $stockMovement->delete();
        });
        return $this->success(null, 'Deleted (stock reversed)');
    }

    public function generateTailorBill(StockMovement $stockMovement, Request $request): JsonResponse
    {
        if ($stockMovement->type !== 'receive_tailor') {
            return $this->error('Only receive_tailor movements can generate a tailor bill', 422);
        }
        if ($stockMovement->is_cancelled) {
            return $this->error('Cancelled movement cannot generate a bill', 422);
        }
        if (!$stockMovement->tailor_id || !$stockMovement->bom_id) {
            return $this->error('Movement is missing tailor or BOM reference', 422);
        }

        $tailor = Tailor::find($stockMovement->tailor_id);
        $bom    = BomHeader::with('lines')->find($stockMovement->bom_id);
        if (!$tailor || !$bom) return $this->error('Tailor or BOM not found', 404);

        // sum incoming product qty (only product lines)
        $productQty = (float) $stockMovement->lines->sum(function ($l) {
            return $l->product_id ? (float) $l->qty : 0;
        });
        if ($productQty <= 0) return $this->error('No product qty in this movement', 422);

        $multiplier = $productQty / max((float) $bom->output_qty, 0.001);

        // collect tailor_service lines
        $serviceLines = $bom->lines->where('kind', 'tailor_service');
        if ($serviceLines->isEmpty()) {
            return $this->error('BOM has no tailor_service lines to bill', 422);
        }

        $pi = DB::transaction(function () use ($tailor, $stockMovement, $bom, $serviceLines, $multiplier, $productQty, $request) {
            // ensure supplier exists for tailor
            if (!$tailor->supplier_id) {
                $sup = $this->ensureTailorSupplier($tailor);
                $tailor->update(['supplier_id' => $sup->id]);
            }

            // pick the AP "Tailor Charges" expense account (or fall back to a default)
            $expense = Account::where('code', 'like', '5000%')->where('type', 'expense')
                ->whereNotIn('id', function ($q) { $q->select('parent_id')->from('accounts')->whereNotNull('parent_id'); })
                ->orderBy('code')->first();

            $piNumber = 'PI-' . str_pad((PurchaseInvoice::max('id') ?? 0) + 1, 5, '0', STR_PAD_LEFT);
            while (PurchaseInvoice::where('pi_number', $piNumber)->exists()) {
                $piNumber = 'PI-' . str_pad((int) substr($piNumber, 3) + 1, 5, '0', STR_PAD_LEFT);
            }

            $totalAmount = 0;
            foreach ($serviceLines as $sl) {
                $qty       = round((float) $sl->qty * $multiplier, 3);
                $unitCost  = (float) $sl->unit_cost;
                $totalAmount += $qty * $unitCost;
            }

            $pi = PurchaseInvoice::create([
                'pi_number'           => $piNumber,
                'supplier_invoice_no' => null,
                'branch_code'         => 'HQ',
                'date'                => $stockMovement->date,
                'due_date'            => null,
                'supplier_id'         => $tailor->supplier_id,
                'account_id'          => $expense?->id,
                'amount'              => $totalAmount,
                'paid_amount'         => 0,
                'reference'           => $stockMovement->movement_no,
                'description'         => "Tailoring services for {$productQty} pcs (per BOM {$bom->bom_number}) — auto-generated from {$stockMovement->movement_no}",
                'status'              => 'posted',
                'created_by'          => $request->user()->id,
            ]);

            foreach ($serviceLines as $sl) {
                $qty       = round((float) $sl->qty * $multiplier, 3);
                $unitCost  = (float) $sl->unit_cost;
                $amount    = $qty * $unitCost;
                $pi->lines()->create([
                    'account_id'  => $expense?->id,
                    'description' => $sl->service_name ?: 'Tailoring service',
                    'item_code'   => null,
                    'qty'         => $qty,
                    'uom'         => $sl->uom,
                    'unit_cost'   => $unitCost,
                    'amount'      => $amount,
                ]);
            }

            return $pi;
        });

        return $this->success($pi->load('lines','supplier'), 'Tailor bill generated');
    }

    private function ensureTailorSupplier(Tailor $tailor): Supplier
    {
        $supCode = 'SUP-T-' . str_pad((string) $tailor->id, 4, '0', STR_PAD_LEFT);
        $existing = Supplier::where('supplier_code', $supCode)->first();
        if ($existing) return $existing;

        return Supplier::create([
            'supplier_code'  => $supCode,
            'name'           => $tailor->name . ' (Tailor)',
            'contact_person' => $tailor->contact_person,
            'phone'          => $tailor->phone,
            'email'          => $tailor->email,
            'address'        => $tailor->address,
            'payment_terms'  => $tailor->payment_terms,
            'is_active'      => true,
        ]);
    }

    public function cancel(StockMovement $stockMovement): JsonResponse
    {
        if ($stockMovement->is_cancelled) return $this->error('Already cancelled', 422);
        DB::transaction(function () use ($stockMovement) {
            $this->reverseStockEffects($stockMovement);
            $stockMovement->update(['is_cancelled' => true, 'status' => 'cancelled']);
        });
        return $this->success($stockMovement->fresh(), 'Cancelled');
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'type'             => 'required|in:receipt,issue,adjust,transfer,send_tailor,receive_tailor',
            'date'             => 'required|date',
            'from_location_id' => 'nullable|exists:stock_locations,id',
            'to_location_id'   => 'nullable|exists:stock_locations,id',
            'tailor_id'        => 'nullable|exists:tailors,id',
            'product_id'       => 'nullable|exists:products,id',
            'bom_id'           => 'nullable|exists:bom_headers,id',
            'reference'        => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
            'status'           => 'in:draft,posted,cancelled',
            'lines'            => 'required|array|min:1',
            'lines.*.stock_item_id' => 'nullable|exists:stock_items,id',
            'lines.*.product_id'    => 'nullable|exists:products,id',
            'lines.*.item_code'     => 'nullable|string|max:64',
            'lines.*.description'   => 'nullable|string|max:255',
            'lines.*.color'         => 'nullable|string|max:64',
            'lines.*.size'          => 'nullable|string|max:32',
            'lines.*.qty'           => 'required|numeric',
            'lines.*.uom'           => 'nullable|string|max:20',
            'lines.*.unit_cost'     => 'nullable|numeric|min:0',
            'lines.*.notes'         => 'nullable|string',
        ]);
    }

    /**
     * Apply stock effects per movement type & line kind.
     *
     *   receipt          → stock_item +
     *   issue            → stock_item -
     *   adjust           → signed (qty as-is)
     *   transfer         → 0 (global stock unchanged; location-level tracking only)
     *   send_tailor      → stock_item -        (raw materials leave warehouse)
     *   receive_tailor   → product +            (finished goods come in)
     *                      stock_item -         (BOM material lines auto-consumed)
     */
    private function applyStockEffects(StockMovement $movement): void
    {
        foreach ($movement->lines as $ln) {
            $sign = $this->signFor($movement->type, $ln);
            if ($sign === 0) continue;
            $this->shiftStock($ln, $sign);
        }
    }

    private function reverseStockEffects(StockMovement $movement): void
    {
        foreach ($movement->lines as $ln) {
            $sign = $this->signFor($movement->type, $ln);
            if ($sign === 0) continue;
            $this->shiftStock($ln, -$sign);
        }
    }

    private function signFor(string $type, StockMovementLine $ln): int
    {
        return match ($type) {
            'receipt'        => +1,
            'issue'          => -1,
            'send_tailor'    => -1,
            'adjust'         => +1, // payload qty already signed
            'transfer'       => 0,
            'receive_tailor' => $ln->product_id ? +1 : -1,  // products IN, materials OUT
            default          => 0,
        };
    }

    private function shiftStock(StockMovementLine $line, int $sign): void
    {
        $qty = (float) $line->qty * $sign;
        if ($line->stock_item_id) {
            StockItem::where('id', $line->stock_item_id)->increment('current_stock', $qty);
        }
        if ($line->product_id) {
            Product::where('id', $line->product_id)->increment('stock', $qty);
        }
        // Product variant by SKU — for Products (e.g. FAB-0001 COTTON PLAIN with variants like
        // FAB-0001-BLUE). When the picker selects a variant, stock_item_id is null but item_code
        // holds the variant SKU. Decrement the variant's stock so issuing fabric reflects in inventory.
        if (! $line->stock_item_id && ! $line->product_id && $line->item_code) {
            $variant = \App\Models\Inventory\ProductVariant::where('sku', $line->item_code)->first();
            if ($variant) {
                $variant->increment('stock', $qty);
            } else {
                // Fallback: parent Product by SKU
                $parent = Product::where('sku', $line->item_code)->first();
                if ($parent) $parent->increment('stock', $qty);
            }
        }
    }

    private function nextNumber(string $type): string
    {
        $prefix = match ($type) {
            'receipt'        => 'SR-',
            'issue'          => 'SI-',
            'adjust'         => 'SA-',
            'transfer'       => 'ST-',
            'send_tailor'    => 'STT-',
            'receive_tailor' => 'STR-',
            default          => 'SM-',
        };
        $next = (StockMovement::where('type', $type)->count()) + 1;
        $num  = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (StockMovement::where('movement_no', $num)->exists()) {
            $next++; $num = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
        }
        return $num;
    }
}
