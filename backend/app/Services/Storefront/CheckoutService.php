<?php

namespace App\Services\Storefront;

use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesOrderLine;
use App\Models\Storefront\Cart;
use Illuminate\Support\Facades\DB;

class CheckoutService
{
    public function __construct(private CartService $cartService, private ShippingCalculator $shipping) {}

    /**
     * @param array $payload {
     *   shipping_address: {name, phone, line1, line2?, city, state_code, postcode, country},
     *   billing_address?: same,
     *   payment_method: 'cod'|'bank_transfer'|'stripe'|'paypal'|...,
     *   customer_id?: int (set by controller after auth/register),
     *   email?: string, phone?: string, customer_name?: string
     * }
     */
    public function place(Cart $cart, array $payload): SalesOrder
    {
        return DB::transaction(function () use ($cart, $payload) {
            $cart = $this->cartService->recalculate($cart);

            // Shipping
            $quote = $this->shipping->quote($payload['shipping_address'], $cart);
            $cart->shipping_total = $quote['amount'];
            $cart->shipping_zone_id = $quote['zone_id'];
            $cart->save();
            $this->cartService->recalculate($cart);

            // Create SalesOrder
            $so = SalesOrder::create([
                'so_number'      => $this->nextSoNumber(),
                'branch_code'    => 'WEB',
                'date'           => now()->toDateString(),
                'customer_id'    => $payload['customer_id'] ?? null,
                'customer_id_storefront' => $payload['customer_id'] ?? null,
                'amount'         => $cart->grand_total,
                'discount_total' => $cart->discount_total,
                'tax_total'      => $cart->tax_total,
                'shipping_total' => $cart->shipping_total,
                'status'         => 'confirmed',
                'source'         => 'storefront',
                'storefront_status' => $this->initialOrderStatus($payload['payment_method'] ?? 'cod'),
                'payment_method' => $payload['payment_method'] ?? 'cod',
                'shipping_zone_id' => $cart->shipping_zone_id,
                'coupon_id'      => $cart->coupon_id,
                'coupon_code'    => $cart->coupon_code,
                'shipping_address_json' => $payload['shipping_address'],
                'billing_address_json'  => $payload['billing_address'] ?? $payload['shipping_address'],
                'description'    => 'Storefront order',
                'created_by'     => null,
            ]);

            foreach ($cart->items as $i => $item) {
                SalesOrderLine::create([
                    'sales_order_id' => $so->id,
                    'item_code'      => $item->item_code,
                    'description'   => $item->name,
                    'color'          => $item->color,
                    'size'           => $item->size,
                    'qty'            => $item->qty,
                    'unit_price'     => $item->unit_price,
                    'amount'         => $item->line_total,
                    'sort_order'     => $i,
                ]);
            }

            $cart->update(['status' => 'converted']);

            return $so->fresh('lines');
        });
    }

    private function initialOrderStatus(string $paymentMethod): string
    {
        return match ($paymentMethod) {
            'cod'           => 'pending_payment',
            'bank_transfer' => 'pending_payment',
            default         => 'pending_payment',
        };
    }

    private function nextSoNumber(): string
    {
        $last = SalesOrder::where('so_number', 'like', 'WEB-%')->orderByDesc('id')->value('so_number');
        $n = $last ? ((int) substr($last, 4)) + 1 : 1;
        return 'WEB-' . str_pad((string) $n, 6, '0', STR_PAD_LEFT);
    }
}
