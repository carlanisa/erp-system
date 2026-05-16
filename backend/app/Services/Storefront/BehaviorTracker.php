<?php

namespace App\Services\Storefront;

use App\Models\Storefront\Cart;
use App\Models\Storefront\CartSignal;
use App\Models\Storefront\ShippingZone;
use App\Models\Storefront\VoucherOffer;

/**
 * Records customer behavior in the storefront and picks an intervention
 * (e.g. forge a voucher, surface a banner) based on the cart's current state.
 */
class BehaviorTracker
{
    public function __construct(private VoucherForge $voucherForge) {}

    public function log(string $sessionToken, string $event, array $payload = [], ?int $cartId = null, ?int $customerId = null): CartSignal
    {
        return CartSignal::create([
            'session_token' => $sessionToken,
            'cart_id'       => $cartId,
            'customer_id'   => $customerId,
            'event'         => $event,
            'payload'       => $payload,
            'created_at'    => now(),
        ]);
    }

    /**
     * Given an event + the current cart, decide if we should forge a voucher
     * or recommend an inline message. Returns:
     *   ['voucher' => VoucherOffer|null, 'message' => string|null, 'mood' => string]
     */
    public function decideIntervention(string $sessionToken, string $event, ?Cart $cart, ?int $customerId = null): array
    {
        $voucher = null;
        $message = null;
        $mood    = $this->inferMood($sessionToken, $cart);

        switch ($event) {
            case 'add_to_cart_first':
                $voucher = $this->voucherForge->forge('add_to_cart_first', $sessionToken, $customerId, $cart);
                break;

            case 'threshold_near':
                if ($cart) {
                    $delta = $this->amountToFreeShipping($cart);
                    if ($delta > 0 && $delta <= 50) {
                        $voucher = $this->voucherForge->forge('threshold_near', $sessionToken, $customerId, $cart);
                        $message = "Add just RM" . number_format($delta, 2) . " more to unlock free shipping!";
                    }
                }
                break;

            case 'idle':
                $voucher = $this->voucherForge->forge('idle_in_cart', $sessionToken, $customerId, $cart);
                break;

            case 'exit_intent':
                $voucher = $this->voucherForge->forge('exit_intent', $sessionToken, $customerId, $cart);
                break;
        }

        return [
            'voucher' => $voucher ? $this->presentVoucher($voucher) : null,
            'message' => $message,
            'mood'    => $mood,
        ];
    }

    /** Very rough mood inference based on recent signals + cart state. */
    private function inferMood(string $sessionToken, ?Cart $cart): string
    {
        $recent = CartSignal::where('session_token', $sessionToken)
            ->where('created_at', '>=', now()->subMinutes(15))
            ->orderByDesc('id')->limit(20)->pluck('event')->all();

        if (in_array('exit_intent', $recent, true))     return 'leaving';
        if (in_array('hover_checkout', $recent, true))  return 'ready_to_buy';
        if (in_array('scroll_checkout', $recent, true)) return 'ready_to_buy';
        if (substr_count(implode(',', $recent), 'removed') >= 2) return 'hesitant';
        if ($cart && $cart->items()->count() === 0)     return 'browsing';
        if ($cart && $cart->subtotal > 0 && in_array('idle', $recent, true)) return 'stalled';
        return 'browsing';
    }

    public function amountToFreeShipping(Cart $cart): float
    {
        // Pick the lowest free_over threshold across enabled WM-ish zones (default MY WM = RM150).
        $thresh = ShippingZone::where('enabled', true)
            ->with('rates')
            ->get()
            ->flatMap(fn($z) => $z->rates->pluck('free_over'))
            ->filter(fn($v) => $v !== null && $v > 0)
            ->min();
        $thresh = $thresh ?: 150;
        return max(0, round($thresh - $cart->subtotal, 2));
    }

    public function presentVoucher(VoucherOffer $v): array
    {
        return [
            'code'         => $v->code,
            'voucher_type' => $v->voucher_type,
            'value'        => $v->value,
            'min_subtotal' => $v->min_subtotal,
            'headline'     => $v->headline,
            'subtext'      => $v->subtext,
            'expires_at'   => $v->expires_at?->toISOString(),
            'trigger'      => $v->trigger,
        ];
    }
}
