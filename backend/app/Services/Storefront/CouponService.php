<?php

namespace App\Services\Storefront;

use App\Models\Storefront\Cart;
use App\Models\Storefront\Coupon;
use App\Models\Storefront\CouponRedemption;

class CouponService
{
    public function __construct(private CartService $cartService) {}

    /**
     * @return array{ok:bool, message:string, discount:float, coupon:?Coupon}
     */
    public function apply(Cart $cart, string $code): array
    {
        $coupon = Coupon::where('code', strtoupper(trim($code)))->first();
        if (!$coupon || !$coupon->isActiveNow()) {
            return ['ok' => false, 'message' => 'Coupon is invalid or expired.', 'discount' => 0, 'coupon' => null];
        }

        if ($cart->subtotal < $coupon->min_subtotal) {
            return [
                'ok' => false,
                'message' => "Minimum order RM" . number_format($coupon->min_subtotal, 2) . " required.",
                'discount' => 0, 'coupon' => null,
            ];
        }

        if ($cart->customer_id && $coupon->per_customer_limit) {
            $used = CouponRedemption::where('coupon_id', $coupon->id)
                ->where('customer_id', $cart->customer_id)->count();
            if ($used >= $coupon->per_customer_limit) {
                return ['ok' => false, 'message' => 'You have already used this coupon.', 'discount' => 0, 'coupon' => null];
            }
        }

        $discount = $this->calculateDiscount($coupon, $cart);

        $cart->coupon_id = $coupon->id;
        $cart->coupon_code = $coupon->code;
        $cart->discount_total = $discount;
        $cart->save();
        $this->cartService->recalculate($cart);

        return [
            'ok' => true,
            'message' => 'Coupon applied successfully.',
            'discount' => $discount,
            'coupon' => $coupon,
        ];
    }

    public function remove(Cart $cart): void
    {
        $cart->coupon_id = null;
        $cart->coupon_code = null;
        $cart->discount_total = 0;
        $cart->save();
        $this->cartService->recalculate($cart);
    }

    public function calculateDiscount(Coupon $coupon, Cart $cart): float
    {
        return match ($coupon->type) {
            'percent'       => round($cart->subtotal * ($coupon->value / 100), 2),
            'fixed'         => min($coupon->value, $cart->subtotal),
            'free_shipping' => 0, // handled at shipping calc
            default         => 0,
        };
    }

    public function recordRedemption(Coupon $coupon, ?int $customerId, ?int $orderId, float $amount): void
    {
        CouponRedemption::create([
            'coupon_id'         => $coupon->id,
            'customer_id'       => $customerId,
            'order_id'          => $orderId,
            'amount_discounted' => $amount,
            'redeemed_at'       => now(),
        ]);
        $coupon->increment('redeem_count');
    }
}
