<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\TailorOrder;
use App\Models\Inventory\TailorOrderReceipt;
use App\Models\Inventory\BomHeader;
use App\Models\Inventory\StockItem;
use App\Models\Inventory\StockMovement;
use App\Models\Inventory\Product;
use App\Models\Inventory\Tailor;
use App\Models\Suppliers\Supplier;
use App\Models\Suppliers\PurchaseInvoice;
use App\Models\Accounting\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TailorOrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = TailorOrder::with(['tailor','product','bom','fromLocation','toLocation','createdBy','lines.stockItem','receipts','bill'])
            ->when($request->status, fn($q,$s) => $q->where('status', $s))
            ->when($request->tailor_id, fn($q,$t) => $q->where('tailor_id', $t))
            ->when($request->search, fn($q,$s) =>
                $q->where('order_no','ilike',"%$s%")->orWhere('reference','ilike',"%$s%")
            )
            ->orderByDesc('date')->orderByDesc('id');
        return $this->success($q->get());
    }

    public function show(TailorOrder $tailorOrder): JsonResponse
    {
        return $this->success($tailorOrder->load([
            'tailor','product','bom.lines.stockItem','fromLocation','toLocation','createdBy',
            'lines.stockItem','receipts.movement','bill','sendMovement.lines',
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $order = DB::transaction(function () use ($data, $request) {
            // Build expected cost & lines from BOM × order_qty (or from passed lines)
            $bom = BomHeader::with('lines.stockItem')->find($data['bom_id']);
            $orderQty = (float) $data['order_qty'];
            $mult = $bom ? $orderQty / max((float) $bom->output_qty, 0.001) : 1;

            $order = TailorOrder::create([
                'order_no'         => $this->nextNumber(),
                'branch_code'      => $data['branch_code'] ?? 'HQ',
                'date'             => $data['date'],
                'due_date'         => $data['due_date'] ?? null,
                'tailor_id'        => $data['tailor_id'],
                'product_id'       => $data['product_id'],
                'bom_id'           => $data['bom_id'] ?? null,
                'from_location_id' => $data['from_location_id'] ?? null,
                'to_location_id'   => $data['to_location_id'] ?? null,
                'order_qty'        => $orderQty,
                'reference'        => $data['reference'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'status'           => 'draft',
                'created_by'       => $request->user()->id,
            ]);

            // Snapshot lines from BOM (or from custom $data['lines'])
            $expectedCost = 0;
            if (!empty($data['lines'])) {
                foreach ($data['lines'] as $i => $ln) {
                    $disc = (float) ($ln['discount'] ?? 0);
                    $tot  = max(0, (float) $ln['qty'] * (float) ($ln['unit_cost'] ?? 0) - $disc);
                    $order->lines()->create([
                        'kind'          => $ln['kind'] ?? 'material',
                        'stock_item_id' => $ln['stock_item_id'] ?? null,
                        'account_id'    => $ln['account_id'] ?? null,
                        'item_code'     => $ln['item_code'] ?? null,
                        'description'   => $ln['description'] ?? null,
                        'service_name'  => $ln['service_name'] ?? null,
                        'color'         => $ln['color'] ?? null,
                        'size'          => $ln['size'] ?? null,
                        'roll_count'    => $ln['roll_count'] ?? null,
                        'qty'           => $ln['qty'],
                        'uom'           => $ln['uom'] ?? null,
                        'unit_cost'     => $ln['unit_cost'] ?? 0,
                        'discount'      => $disc,
                        'total_cost'    => $tot,
                        'notes'         => $ln['notes'] ?? null,
                        'sort_order'    => $i,
                    ]);
                    $expectedCost += $tot;
                }
            } elseif ($bom) {
                foreach ($bom->lines as $i => $bl) {
                    $qty       = round((float) $bl->qty * $mult, 3);
                    $unitCost  = $bl->kind === 'material'
                        ? (float) optional($bl->stockItem)->unit_cost
                        : (float) $bl->unit_cost;
                    $disc      = round((float) ($bl->discount ?? 0) * $mult, 2);
                    $tot       = max(0, $qty * $unitCost - $disc);
                    $rollCount = $bl->roll_count !== null ? round((float) $bl->roll_count * $mult, 3) : null;
                    $order->lines()->create([
                        'kind'          => $bl->kind,
                        'stock_item_id' => $bl->stock_item_id,
                        'account_id'    => $bl->account_id,
                        'item_code'     => $bl->item_code  ?? optional($bl->stockItem)->item_code,
                        'description'   => $bl->description,
                        'service_name'  => $bl->service_name,
                        'color'         => $bl->color      ?? optional($bl->stockItem)->color,
                        'size'          => $bl->size       ?? optional($bl->stockItem)->size,
                        'roll_count'    => $rollCount,
                        'qty'           => $qty,
                        'uom'           => $bl->uom ?? optional($bl->stockItem)->uom,
                        'unit_cost'     => $unitCost,
                        'discount'      => $disc,
                        'total_cost'    => $tot,
                        'notes'         => null,
                        'sort_order'    => $i,
                    ]);
                    $expectedCost += $tot;
                }
            }
            $order->update(['expected_cost' => $expectedCost]);

            // Optionally issue fabric immediately if requested
            if (!empty($data['issue_now'])) {
                $this->issueFabric($order, $request->user()->id);
            }

            return $order;
        });

        return $this->success($order->fresh(['tailor','product','bom','fromLocation','toLocation','lines.stockItem','receipts','sendMovement']), 'Tailor order created');
    }

    public function update(Request $request, TailorOrder $tailorOrder): JsonResponse
    {
        if ($tailorOrder->is_cancelled) return $this->error('Cancelled order cannot be edited', 422);
        $data = $this->validatePayload($request, true);

        DB::transaction(function () use ($data, $tailorOrder) {
            $tailorOrder->update(collect($data)->except(['lines','issue_now'])->toArray());
            if (array_key_exists('lines', $data)) {
                $tailorOrder->lines()->delete();
                $expected = 0;
                foreach ($data['lines'] as $i => $ln) {
                    $disc = (float) ($ln['discount'] ?? 0);
                    $tot  = max(0, (float) $ln['qty'] * (float) ($ln['unit_cost'] ?? 0) - $disc);
                    $tailorOrder->lines()->create([
                        'kind'          => $ln['kind'] ?? 'material',
                        'stock_item_id' => $ln['stock_item_id'] ?? null,
                        'account_id'    => $ln['account_id'] ?? null,
                        'item_code'     => $ln['item_code'] ?? null,
                        'description'   => $ln['description'] ?? null,
                        'service_name'  => $ln['service_name'] ?? null,
                        'color'         => $ln['color'] ?? null,
                        'size'          => $ln['size'] ?? null,
                        'roll_count'    => $ln['roll_count'] ?? null,
                        'qty'           => $ln['qty'],
                        'uom'           => $ln['uom'] ?? null,
                        'unit_cost'     => $ln['unit_cost'] ?? 0,
                        'discount'      => $disc,
                        'total_cost'    => $tot,
                        'notes'         => $ln['notes'] ?? null,
                        'sort_order'    => $i,
                    ]);
                    $expected += $tot;
                }
                $tailorOrder->update(['expected_cost' => $expected]);
            }
        });

        return $this->success($tailorOrder->fresh(['tailor','product','bom','lines.stockItem','receipts']), 'Updated');
    }

    public function destroy(TailorOrder $tailorOrder): JsonResponse
    {
        DB::transaction(function () use ($tailorOrder) {
            // reverse all receipts (each had a stock_movement)
            foreach ($tailorOrder->receipts as $r) {
                if ($r->movement_id) {
                    app(StockMovementController::class)->destroy(StockMovement::find($r->movement_id));
                }
            }
            // reverse send movement
            if ($tailorOrder->send_movement_id) {
                app(StockMovementController::class)->destroy(StockMovement::find($tailorOrder->send_movement_id));
            }
            $tailorOrder->delete();
        });
        return $this->success(null, 'Order deleted (stock reversed)');
    }

    /** Issue fabric to tailor — creates send_tailor stock_movement */
    public function issue(Request $request, TailorOrder $tailorOrder): JsonResponse
    {
        if ($tailorOrder->is_cancelled) return $this->error('Order is cancelled', 422);
        if ($tailorOrder->send_movement_id) return $this->error('Fabric already issued', 422);

        $movement = DB::transaction(function () use ($tailorOrder, $request) {
            return $this->issueFabric($tailorOrder, $request->user()->id);
        });

        return $this->success($tailorOrder->fresh(['lines.stockItem','sendMovement.lines']), 'Fabric issued');
    }

    /** Receive a batch of finished products (with auto-deduct) */
    public function receive(Request $request, TailorOrder $tailorOrder): JsonResponse
    {
        if ($tailorOrder->is_cancelled) return $this->error('Order is cancelled', 422);
        $data = $request->validate([
            'date'      => 'required|date',
            'qty'       => 'required|numeric|min:0.001',
            'reference' => 'nullable|string|max:100',
            'notes'     => 'nullable|string',
            'unit_cost' => 'nullable|numeric|min:0',
        ]);

        $receipt = DB::transaction(function () use ($tailorOrder, $data, $request) {
            // Create the underlying receive_tailor stock_movement.
            // IMPORTANT: if fabric was already issued (send_movement exists), do NOT pass bom_id
            // — otherwise the StockMovementController would expand BOM and deduct fabric AGAIN.
            // The fabric was already consumed at Issue stage; this receive is purely "products IN".
            $alreadyIssued = !is_null($tailorOrder->send_movement_id);
            $movPayload = new Request([
                'type'             => 'receive_tailor',
                'date'             => $data['date'],
                'from_location_id' => $tailorOrder->tailor?->location_id,
                'to_location_id'   => $tailorOrder->to_location_id,
                'tailor_id'        => $tailorOrder->tailor_id,
                'product_id'       => $tailorOrder->product_id,
                'bom_id'           => $alreadyIssued ? null : $tailorOrder->bom_id,
                'reference'        => $data['reference'] ?? $tailorOrder->order_no,
                'notes'            => $data['notes']     ?? null,
                'lines'            => [[
                    'product_id' => $tailorOrder->product_id,
                    'qty'        => $data['qty'],
                    'uom'        => $tailorOrder->product?->uom ?? 'PCS',
                    'unit_cost'  => $data['unit_cost'] ?? $this->perUnitCost($tailorOrder),
                ]],
            ]);
            $movPayload->setUserResolver(fn() => $request->user());

            $resp = app(StockMovementController::class)->store($movPayload);
            $movement = StockMovement::find(json_decode($resp->getContent(), true)['data']['id']);
            $movement->update(['tailor_order_id' => $tailorOrder->id]);

            $receipt = $tailorOrder->receipts()->create([
                'date'        => $data['date'],
                'qty'         => $data['qty'],
                'reference'   => $data['reference'] ?? null,
                'notes'       => $data['notes']     ?? null,
                'movement_id' => $movement->id,
                'created_by'  => $request->user()->id,
            ]);

            // recalc received_qty + status
            $totalReceived = (float) $tailorOrder->receipts()->sum('qty') + (float) $data['qty']; // not yet refreshed
            $totalReceived = (float) $tailorOrder->receipts()->sum('qty');
            $tailorOrder->refresh();
            $tailorOrder->update([
                'received_qty' => $totalReceived,
                'status'       => $totalReceived >= (float) $tailorOrder->order_qty ? 'received' : 'partial_received',
            ]);

            return $receipt;
        });

        return $this->success($tailorOrder->fresh(['receipts.movement','lines.stockItem','sendMovement']), 'Receipt recorded');
    }

    public function deleteReceipt(TailorOrder $tailorOrder, TailorOrderReceipt $receipt): JsonResponse
    {
        if ($receipt->tailor_order_id !== $tailorOrder->id) return $this->error('Receipt does not belong to this order', 422);
        DB::transaction(function () use ($tailorOrder, $receipt) {
            if ($receipt->movement_id) {
                app(StockMovementController::class)->destroy(StockMovement::find($receipt->movement_id));
            }
            $receipt->delete();

            $totalReceived = (float) $tailorOrder->receipts()->sum('qty');
            $tailorOrder->update([
                'received_qty' => $totalReceived,
                'status'       => $totalReceived <= 0 ? ($tailorOrder->send_movement_id ? 'fabric_issued' : 'draft')
                                  : ($totalReceived >= (float) $tailorOrder->order_qty ? 'received' : 'partial_received'),
            ]);
        });
        return $this->success($tailorOrder->fresh(['receipts.movement']), 'Receipt removed (reversed)');
    }

    /** Generate Tailor Bill (Purchase Invoice) — only stitching/labor */
    public function generateBill(Request $request, TailorOrder $tailorOrder): JsonResponse
    {
        if ($tailorOrder->bill_pi_id) return $this->error('Bill already generated', 422);
        if ($tailorOrder->received_qty <= 0) return $this->error('Nothing received yet to bill', 422);

        $tailor = $tailorOrder->tailor;
        if (!$tailor) return $this->error('Tailor not found', 404);

        $serviceLines = $tailorOrder->lines()->where('kind', 'tailor_service')->get();
        if ($serviceLines->isEmpty()) return $this->error('No tailor_service lines to bill', 422);

        // bill basis: received_qty (so partial bills become possible later by extending)
        $orderQty = max((float) $tailorOrder->order_qty, 0.001);
        $billRatio = (float) $tailorOrder->received_qty / $orderQty;

        $pi = DB::transaction(function () use ($tailorOrder, $tailor, $serviceLines, $billRatio, $request) {
            if (!$tailor->supplier_id) {
                $sup = Supplier::firstOrCreate(
                    ['supplier_code' => 'SUP-T-' . str_pad((string) $tailor->id, 4, '0', STR_PAD_LEFT)],
                    [
                        'name'           => $tailor->name . ' (Tailor)',
                        'contact_person' => $tailor->contact_person,
                        'phone'          => $tailor->phone,
                        'email'          => $tailor->email,
                        'address'        => $tailor->address,
                        'payment_terms'  => $tailor->payment_terms,
                        'is_active'      => true,
                    ]
                );
                $tailor->update(['supplier_id' => $sup->id]);
            }

            $expense = Account::where('code', 'like', '5000%')->where('type', 'expense')
                ->whereNotIn('id', function ($q) { $q->select('parent_id')->from('accounts')->whereNotNull('parent_id'); })
                ->orderBy('code')->first();

            $piNumber = 'PI-' . str_pad((PurchaseInvoice::max('id') ?? 0) + 1, 5, '0', STR_PAD_LEFT);
            while (PurchaseInvoice::where('pi_number', $piNumber)->exists()) {
                $piNumber = 'PI-' . str_pad((int) substr($piNumber, 3) + 1, 5, '0', STR_PAD_LEFT);
            }

            $totalAmount = 0;
            foreach ($serviceLines as $sl) {
                $qty       = round((float) $sl->qty * $billRatio, 3);
                $unitCost  = (float) $sl->unit_cost;
                $totalAmount += $qty * $unitCost;
            }

            $pi = PurchaseInvoice::create([
                'pi_number'           => $piNumber,
                'branch_code'         => 'HQ',
                'date'                => now()->toDateString(),
                'supplier_id'         => $tailor->supplier_id,
                'account_id'          => $expense?->id,
                'amount'              => $totalAmount,
                'paid_amount'         => 0,
                'reference'           => $tailorOrder->order_no,
                'description'         => "Tailoring services for {$tailorOrder->received_qty} pcs (per order {$tailorOrder->order_no}, BOM {$tailorOrder->bom?->bom_number}) — auto-generated",
                'status'              => 'posted',
                'created_by'          => $request->user()->id,
            ]);

            foreach ($serviceLines as $sl) {
                $qty       = round((float) $sl->qty * $billRatio, 3);
                $unitCost  = (float) $sl->unit_cost;
                $pi->lines()->create([
                    'account_id'  => $expense?->id,
                    'description' => $sl->service_name ?: 'Tailoring service',
                    'qty'         => $qty,
                    'uom'         => $sl->uom,
                    'unit_cost'   => $unitCost,
                    'amount'      => $qty * $unitCost,
                ]);
            }

            $tailorOrder->update(['bill_pi_id' => $pi->id, 'status' => 'billed']);

            return $pi;
        });

        return $this->success($tailorOrder->fresh(['bill.lines','bill.supplier']), 'Tailor bill generated');
    }

    /* ─────────────────────────────────────────── */

    private function validatePayload(Request $request, bool $update = false): array
    {
        $rules = [
            'date'             => ($update ? 'sometimes|' : '') . 'required|date',
            'due_date'         => 'nullable|date',
            'tailor_id'        => ($update ? 'sometimes|' : '') . 'required|exists:tailors,id',
            'product_id'       => 'nullable|exists:products,id',
            'bom_id'           => 'nullable|exists:bom_headers,id',
            'from_location_id' => 'nullable|exists:stock_locations,id',
            'to_location_id'   => 'nullable|exists:stock_locations,id',
            'order_qty'        => ($update ? 'sometimes|' : '') . 'required|numeric|min:0.001',
            'branch_code'      => 'nullable|string|max:20',
            'reference'        => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
            'issue_now'        => 'boolean',
            'lines'            => 'array',
            'lines.*.kind'          => 'in:material,tailor_service,overhead',
            'lines.*.stock_item_id' => 'nullable|exists:stock_items,id',
            'lines.*.account_id'    => 'nullable|exists:accounts,id',
            'lines.*.item_code'     => 'nullable|string|max:100',
            'lines.*.description'   => 'nullable|string',
            'lines.*.service_name'  => 'nullable|string|max:255',
            'lines.*.color'         => 'nullable|string|max:80',
            'lines.*.size'          => 'nullable|string|max:80',
            'lines.*.roll_count'    => 'nullable|numeric',
            'lines.*.qty'           => 'required|numeric',
            'lines.*.uom'           => 'nullable|string|max:20',
            'lines.*.unit_cost'     => 'nullable|numeric|min:0',
            'lines.*.discount'      => 'nullable|numeric|min:0',
            'lines.*.notes'         => 'nullable|string',
            'lines.*.avg_per_piece' => 'nullable|numeric|min:0',
        ];
        return $request->validate($rules);
    }

    private function issueFabric(TailorOrder $order, int $userId): StockMovement
    {
        if ($order->send_movement_id) return $order->sendMovement;

        $materialLines = $order->lines->where('kind', 'material');
        if ($materialLines->isEmpty()) {
            // create empty movement to mark as issued (e.g. service-only orders)
        }

        $payload = new Request([
            'type'             => 'send_tailor',
            'date'             => $order->date->toDateString(),
            'from_location_id' => $order->from_location_id,
            'to_location_id'   => $order->tailor?->location_id,
            'tailor_id'        => $order->tailor_id,
            'product_id'       => null,
            'bom_id'           => $order->bom_id,
            'reference'        => $order->order_no,
            'notes'            => "Auto-issue for order {$order->order_no}",
            'lines'            => $materialLines->map(fn ($l) => [
                'stock_item_id' => $l->stock_item_id,
                // Pass item_code (variant SKU like FAB-0001-BLUE) so applyStockDelta can find
                // the Product variant when stock_item_id is null (Products with variants don't
                // have stock_items rows — the variant SKU is the lookup key).
                'item_code'     => $l->item_code,
                'description'   => $l->description,
                'color'         => $l->color,
                'size'          => $l->size,
                'qty'           => $l->qty,
                'uom'           => $l->uom,
                'unit_cost'     => $l->unit_cost,
                'notes'         => $l->notes,
            ])->values()->toArray() ?: [['stock_item_id' => null, 'qty' => 0, 'uom' => null, 'unit_cost' => 0]],
        ]);
        $payload->setUserResolver(fn() => \App\Models\User::find($userId));

        // store via controller (handles totals + stock effects)
        $resp = app(StockMovementController::class)->store($payload);
        $movement = StockMovement::find(json_decode($resp->getContent(), true)['data']['id']);
        $movement->update(['tailor_order_id' => $order->id]);

        $order->update([
            'send_movement_id' => $movement->id,
            'status'           => 'fabric_issued',
        ]);

        return $movement->fresh();
    }

    private function perUnitCost(TailorOrder $order): float
    {
        $orderQty = max((float) $order->order_qty, 0.001);
        return (float) $order->expected_cost / $orderQty;
    }

    private function nextNumber(): string
    {
        $next = (TailorOrder::max('id') ?? 0) + 1;
        $num  = 'TO-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (TailorOrder::where('order_no', $num)->exists()) {
            $next++; $num = 'TO-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        }
        return $num;
    }
}
