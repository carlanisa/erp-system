<?php

namespace App\Services\Storefront;

use App\Models\Sales\SaleInvoice;
use App\Models\Sales\SaleInvoiceLine;
use App\Models\Storefront\Cart;
use App\Models\Storefront\Coupon;
use Illuminate\Support\Facades\DB;

/**
 * Creates a SaleInvoice with source='online' so the storefront order appears
 * in the existing /sales/orders unified dashboard alongside POS + ERP entries.
 */
class CheckoutService
{
    public function __construct(
        private CartService $cartService,
        private ShippingCalculator $shipping,
        private CouponService $couponService,
    ) {}

    /**
     * @param array $payload {
     *   shipping_address: {name, phone, line1, line2?, city, state_code?, postcode, country},
     *   billing_address?: same,
     *   payment_method: code in storefront_payment_methods,
     *   customer_id?: int
     * }
     */
    public function place(Cart $cart, array $payload): SaleInvoice
    {
        return DB::transaction(function () use ($cart, $payload) {
            $cart = $this->cartService->recalculate($cart);

            // Recalculate shipping for the chosen address
            $quote = $this->shipping->quote($payload['shipping_address'], $cart);
            $cart->shipping_total   = $quote['amount'];
            $cart->shipping_zone_id = $quote['zone_id'];
            $cart->save();
            $this->cartService->recalculate($cart);

            $invoice = SaleInvoice::create([
                'si_number'       => $this->nextInvoiceNumber(),
                'branch_code'     => 'WEB',
                'source'          => 'online',
                'date'            => now()->toDateString(),
                'customer_id'     => $payload['customer_id'] ?? null,
                'amount'          => $cart->grand_total,
                'paid_amount'     => 0,
                'discount_total'  => $cart->discount_total,
                'tax_total'       => $cart->tax_total,
                'shipping_total'  => $cart->shipping_total,
                'status'          => 'posted',
                'storefront_status' => $this->initialOrderStatus($payload['payment_method'] ?? 'cod'),
                'payment_method'  => $payload['payment_method'] ?? 'cod',
                'shipping_zone_id'=> $cart->shipping_zone_id,
                'coupon_id'       => $cart->coupon_id,
                'coupon_code'     => $cart->coupon_code,
                'shipping_address_json' => $payload['shipping_address'],
                'billing_address_json'  => $payload['billing_address'] ?? $payload['shipping_address'],
                'description'     => 'Storefront order',
                'created_by'      => null,
            ]);

            foreach ($cart->items as $i => $item) {
                SaleInvoiceLine::create([
                    'sale_invoice_id' => $invoice->id,
                    'item_code'       => $item->item_code,
                    'description'     => $item->name,
                    'color'           => $item->color,
                    'size'            => $item->size,
                    'qty'             => $item->qty,
                    'unit_price'      => $item->unit_price,
                    'amount'          => $item->line_total,
                    'sort_order'      => $i,
                ]);
            }

            // Record coupon redemption if any
            if ($cart->coupon_id) {
                $coupon = Coupon::find($cart->coupon_id);
                if ($coupon) {
                    $this->couponService->recordRedemption(
                        $coupon,
                        $payload['customer_id'] ?? null,
                        $invoice->id,
                        $cart->discount_total,
                    );
                }
            }

            $cart->update(['status' => 'converted']);

            return $invoice->fresh('lines');
        });
    }

    private function initialOrderStatus(string $paymentMethod): string
    {
        return match ($paymentMethod) {
            'cod', 'bank_transfer' => 'pending_payment',
            default                => 'pending_payment',
        };
    }

    private function nextInvoiceNumber(): string
    {
        $last = SaleInvoice::where('si_number', 'like', 'WEB-%')->orderByDesc('id')->value('si_number');
        $n = $last ? ((int) substr($last, 4)) + 1 : 1;
        return 'WEB-' . str_pad((string) $n, 6, '0', STR_PAD_LEFT);
    }
}
