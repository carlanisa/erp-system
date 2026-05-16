<?php

namespace App\Http\Controllers\Api\Sales\OrderManagement;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use App\Models\Marketplace\MarketplaceChannel;
use App\Models\Marketplace\MarketplaceOrder;
use App\Models\Marketplace\MarketplaceOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebhookController extends Controller
{
    use ApiResponse;

    public function shopee(Request $request): JsonResponse
    {
        // TODO: verify signature: hash_hmac('sha256', $url . $body, $partnerKey)
        $code = $request->input('shop_region') === 'SG' ? 'shopee_sg' : 'shopee_my';
        return $this->upsertOrder($code, $request->all());
    }

    public function tiktok(Request $request): JsonResponse
    {
        // TODO: verify TikTok signature
        return $this->upsertOrder('tiktok_my', $request->all());
    }

    public function website(Request $request): JsonResponse
    {
        return $this->upsertOrder('website', $request->all());
    }

    private function upsertOrder(string $channelCode, array $payload): JsonResponse
    {
        $channel = MarketplaceChannel::where('code', $channelCode)->firstOrFail();
        $externalId = (string) ($payload['order_id'] ?? $payload['id'] ?? '');
        if (!$externalId) {
            return $this->error('Missing order_id in webhook payload', 422);
        }

        return DB::transaction(function () use ($channel, $payload, $externalId) {
            $order = MarketplaceOrder::updateOrCreate(
                ['channel_id' => $channel->id, 'external_order_id' => $externalId],
                [
                    'external_order_sn' => $payload['order_sn'] ?? null,
                    'buyer_name'        => $payload['buyer_name'] ?? null,
                    'buyer_phone'       => $payload['buyer_phone'] ?? null,
                    'ship_address'      => $payload['ship_address'] ?? null,
                    'status'            => $this->mapStatus($payload['status'] ?? 'pending_payment'),
                    'payment_status'    => $payload['payment_status'] ?? null,
                    'currency'          => $payload['currency'] ?? 'MYR',
                    'subtotal'          => $payload['subtotal'] ?? 0,
                    'shipping_fee'      => $payload['shipping_fee'] ?? 0,
                    'total'             => $payload['total'] ?? 0,
                    'awb_no'            => $payload['awb_no'] ?? $payload['tracking_no'] ?? null,
                    'courier'           => $payload['courier'] ?? null,
                    'awb_pdf_path'      => $payload['awb_pdf_path'] ?? null,
                    'ship_by_date'      => $payload['ship_by_date'] ?? null,
                    'weight_kg'         => $payload['weight_kg'] ?? null,
                    'raw_payload'       => $payload,
                    'placed_at'         => $payload['placed_at'] ?? now(),
                ]
            );

            if (!empty($payload['items']) && is_array($payload['items'])) {
                $order->items()->delete();
                foreach ($payload['items'] as $row) {
                    $sku = $row['sku'] ?? $row['model_sku'] ?? null;
                    $variant = $sku ? ProductVariant::where('sku', $sku)->orWhere('barcode', $sku)->first() : null;
                    $product = $variant
                        ? Product::find($variant->product_id)
                        : ($sku ? Product::where('sku', $sku)->orWhere('barcode', $sku)->first() : null);

                    MarketplaceOrderItem::create([
                        'marketplace_order_id'  => $order->id,
                        'product_id'            => $product?->id,
                        'product_variant_id'    => $variant?->id,
                        'external_sku'          => $sku,
                        'external_variant_name' => $row['variation_name'] ?? null,
                        'name_snapshot'         => $row['name'] ?? $product?->name,
                        'image_url'             => $row['image_url'] ?? null,
                        'qty'                   => $row['qty'] ?? 1,
                        'unit_price'            => $row['unit_price'] ?? 0,
                    ]);
                }
            }

            return $this->success(['order_id' => $order->id]);
        });
    }

    private function mapStatus(string $s): string
    {
        return match (strtoupper($s)) {
            'UNPAID', 'PENDING_PAYMENT' => 'pending_payment',
            'PAID', 'TO_SHIP' => 'paid',
            'READY_TO_SHIP' => 'to_ship',
            'SHIPPED', 'IN_TRANSIT' => 'shipped',
            'COMPLETED', 'DELIVERED' => 'delivered',
            'CANCELLED' => 'cancelled',
            'RETURN_REQUESTED', 'RETURN' => 'return_requested',
            'RETURNED' => 'returned',
            'REFUNDED' => 'refunded',
            default => strtolower($s),
        };
    }
}
