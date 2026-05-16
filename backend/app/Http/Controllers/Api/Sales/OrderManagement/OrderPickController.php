<?php

namespace App\Http\Controllers\Api\Sales\OrderManagement;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use App\Models\Marketplace\MarketplaceOrder;
use App\Models\Marketplace\MarketplaceOrderItem;
use App\Models\Marketplace\OrderPickMismatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderPickController extends Controller
{
    use ApiResponse;

    /**
     * Scan AWB → load order with items and product images.
     */
    public function lookupByAwb(Request $request): JsonResponse
    {
        $data = $request->validate([
            'awb_no' => 'required|string',
        ]);
        $awb = trim($data['awb_no']);

        $order = MarketplaceOrder::with(['channel', 'items.product', 'items.variant'])
            ->where('awb_no', $awb)
            ->orWhere('external_order_id', $awb)
            ->orWhere('external_order_sn', $awb)
            ->first();

        if (!$order) {
            return $this->error('No order found for AWB ' . $awb, 404);
        }

        if (in_array($order->status, ['cancelled', 'refunded'])) {
            return $this->error('Order is ' . $order->status . ' — cannot pack', 422);
        }

        return $this->success($this->serializeForPack($order));
    }

    /**
     * Scan a product SKU/barcode against the open order.
     * Match logic: scanned value matches a still-unpicked item's external_sku,
     * variant sku/barcode, or product sku/barcode (case-insensitive, trimmed).
     */
    public function scanSku(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|integer|exists:marketplace_orders,id',
            'sku'      => 'required|string',
        ]);
        $scanned = strtoupper(trim($data['sku']));
        $order = MarketplaceOrder::with(['items.product', 'items.variant'])->findOrFail($data['order_id']);

        $unpicked = $order->items->filter(fn($i) => is_null($i->picked_at));
        if ($unpicked->isEmpty()) {
            return $this->error('All items already picked', 422);
        }

        $matched = $unpicked->first(function (MarketplaceOrderItem $i) use ($scanned) {
            $candidates = array_filter([
                $i->external_sku,
                $i->variant?->sku, $i->variant?->barcode,
                $i->product?->sku, $i->product?->barcode,
            ]);
            foreach ($candidates as $c) {
                if (strtoupper(trim($c)) === $scanned) return true;
            }
            return false;
        });

        if (!$matched) {
            OrderPickMismatch::create([
                'marketplace_order_id' => $order->id,
                'expected_sku' => $unpicked->pluck('external_sku')->implode(', '),
                'scanned_sku'  => $scanned,
                'user_id'      => $request->user()?->id,
                'created_at'   => now(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'SKU mismatch — scanned ' . $scanned . ' does not match this order',
                'data' => [
                    'expected' => $unpicked->pluck('external_sku')->values(),
                    'scanned'  => $scanned,
                ],
            ], 422);
        }

        $matched->update([
            'scanned_sku' => $scanned,
            'picked_at'   => now(),
            'picked_by'   => $request->user()?->id,
        ]);

        return $this->success([
            'matched_item_id' => $matched->id,
            'order'           => $this->serializeForPack($order->fresh(['channel', 'items.product', 'items.variant'])),
        ], 'Match confirmed');
    }

    public function confirmPacked(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|integer|exists:marketplace_orders,id',
        ]);
        $order = MarketplaceOrder::with('items')->findOrFail($data['order_id']);

        $remaining = $order->items->whereNull('picked_at')->count();
        if ($remaining > 0) {
            return $this->error("Cannot confirm — $remaining item(s) not yet scanned", 422);
        }

        $order->update([
            'status'    => 'shipped',
            'packed_at' => now(),
            'packed_by' => $request->user()?->id,
        ]);

        return $this->success($order->fresh(['channel', 'items']), 'Order packed and marked shipped');
    }

    private function serializeForPack(MarketplaceOrder $order): array
    {
        return [
            'id'                => $order->id,
            'external_order_id' => $order->external_order_id,
            'external_order_sn' => $order->external_order_sn,
            'channel'           => $order->channel,
            'awb_no'            => $order->awb_no,
            'courier'           => $order->courier,
            'status'            => $order->status,
            'buyer_name'        => $order->buyer_name,
            'ship_by_date'      => $order->ship_by_date,
            'total'             => $order->total,
            'currency'          => $order->currency,
            'items' => $order->items->map(fn($i) => [
                'id'                    => $i->id,
                'external_sku'          => $i->external_sku,
                'external_variant_name' => $i->external_variant_name,
                'name_snapshot'         => $i->name_snapshot,
                'image_url'             => $i->image_url ?: $i->product?->featured_image_url ?: $i->product?->image_path,
                'qty'                   => $i->qty,
                'unit_price'            => (float) $i->unit_price,
                'picked_at'             => $i->picked_at,
                'scanned_sku'           => $i->scanned_sku,
                'variant_sku'           => $i->variant?->sku,
                'product_sku'           => $i->product?->sku,
            ])->values(),
            'all_picked' => $order->items->whereNull('picked_at')->isEmpty(),
        ];
    }
}
