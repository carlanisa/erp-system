<?php

namespace App\Http\Controllers\Api\Sales\OrderManagement;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Marketplace\MarketplaceChannel;
use App\Models\Marketplace\MarketplaceOrder;
use App\Models\Marketplace\MarketplaceOrderItem;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketplaceOrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = MarketplaceOrder::with(['channel', 'items'])->latest('id');

        if ($request->status && $request->status !== 'all') {
            $q->where('status', $request->status);
        }
        if ($request->channel_code) {
            $q->whereHas('channel', fn($c) => $c->where('code', $request->channel_code));
        }
        if ($request->search) {
            $s = $request->search;
            $q->where(fn($w) => $w
                ->where('external_order_id', 'ilike', "%$s%")
                ->orWhere('external_order_sn', 'ilike', "%$s%")
                ->orWhere('awb_no', 'ilike', "%$s%")
                ->orWhere('buyer_name', 'ilike', "%$s%"));
        }

        $orders = $q->paginate($request->per_page ?: 25);

        return response()->json([
            'success' => true,
            'data'    => $orders->items(),
            'meta'    => [
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'per_page'     => $orders->perPage(),
                'total'        => $orders->total(),
                'counts'       => $this->statusCounts(),
            ],
        ]);
    }

    public function show($id): JsonResponse
    {
        $order = MarketplaceOrder::with([
            'channel', 'items.product', 'items.variant',
            'mismatches', 'returns',
        ])->findOrFail($id);

        return $this->success($order);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'channel_code'      => 'required|string|exists:marketplace_channels,code',
            'external_order_id' => 'required|string|max:64',
            'external_order_sn' => 'nullable|string|max:64',
            'buyer_name'        => 'nullable|string',
            'buyer_phone'       => 'nullable|string',
            'ship_address'      => 'nullable|array',
            'status'            => 'nullable|string',
            'currency'          => 'nullable|string|max:8',
            'subtotal'          => 'nullable|numeric',
            'shipping_fee'      => 'nullable|numeric',
            'total'             => 'nullable|numeric',
            'awb_no'            => 'nullable|string',
            'courier'           => 'nullable|string',
            'awb_pdf_path'      => 'nullable|string',
            'ship_by_date'      => 'nullable|date',
            'weight_kg'         => 'nullable|numeric',
            'items'             => 'required|array|min:1',
            'items.*.external_sku'          => 'required|string',
            'items.*.external_variant_name' => 'nullable|string',
            'items.*.name_snapshot'         => 'nullable|string',
            'items.*.image_url'             => 'nullable|string',
            'items.*.qty'                   => 'required|integer|min:1',
            'items.*.unit_price'            => 'nullable|numeric',
        ]);

        $channel = MarketplaceChannel::where('code', $data['channel_code'])->firstOrFail();

        return DB::transaction(function () use ($data, $channel) {
            $order = MarketplaceOrder::create([
                'channel_id'        => $channel->id,
                'external_order_id' => $data['external_order_id'],
                'external_order_sn' => $data['external_order_sn'] ?? null,
                'buyer_name'        => $data['buyer_name'] ?? null,
                'buyer_phone'       => $data['buyer_phone'] ?? null,
                'ship_address'      => $data['ship_address'] ?? null,
                'status'            => $data['status'] ?? 'pending_payment',
                'currency'          => $data['currency'] ?? 'MYR',
                'subtotal'          => $data['subtotal'] ?? 0,
                'shipping_fee'      => $data['shipping_fee'] ?? 0,
                'total'             => $data['total'] ?? 0,
                'awb_no'            => $data['awb_no'] ?? null,
                'courier'           => $data['courier'] ?? null,
                'awb_pdf_path'      => $data['awb_pdf_path'] ?? null,
                'ship_by_date'      => $data['ship_by_date'] ?? null,
                'weight_kg'         => $data['weight_kg'] ?? null,
                'placed_at'         => now(),
            ]);

            foreach ($data['items'] as $row) {
                $variant = ProductVariant::where('sku', $row['external_sku'])
                    ->orWhere('barcode', $row['external_sku'])
                    ->first();
                $product = $variant
                    ? Product::find($variant->product_id)
                    : Product::where('sku', $row['external_sku'])->orWhere('barcode', $row['external_sku'])->first();

                MarketplaceOrderItem::create([
                    'marketplace_order_id'  => $order->id,
                    'product_id'            => $product?->id,
                    'product_variant_id'    => $variant?->id,
                    'external_sku'          => $row['external_sku'],
                    'external_variant_name' => $row['external_variant_name'] ?? null,
                    'name_snapshot'         => $row['name_snapshot'] ?? $product?->name,
                    'image_url'             => $row['image_url'] ?? ($product?->featured_image_url ?: $product?->image_path),
                    'qty'                   => $row['qty'],
                    'unit_price'            => $row['unit_price'] ?? 0,
                ]);
            }

            return $this->success($order->fresh(['channel', 'items']), 'Order created', 201);
        });
    }

    public function markPaid($id): JsonResponse
    {
        $order = MarketplaceOrder::findOrFail($id);
        $order->update(['status' => 'paid', 'payment_status' => 'paid']);
        return $this->success($order);
    }

    public function cancel($id): JsonResponse
    {
        $order = MarketplaceOrder::findOrFail($id);
        $order->update(['status' => 'cancelled']);
        return $this->success($order);
    }

    private function statusCounts(): array
    {
        return MarketplaceOrder::select('status', DB::raw('count(*) as c'))
            ->groupBy('status')->pluck('c', 'status')->toArray();
    }
}
