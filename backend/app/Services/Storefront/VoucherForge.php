<?php

namespace App\Services\Storefront;

use App\Models\Storefront\Cart;
use App\Models\Storefront\Coupon;
use App\Models\Storefront\VoucherOffer;
use App\Models\Storefront\VoucherRule;
use Illuminate\Support\Str;

/**
 * Forges one-off vouchers (free shipping / percent / fixed) tied to a session
 * AND mirrors them as Coupons so the existing checkout coupon flow can redeem
 * them at apply time.
 */
class VoucherForge
{
    public function __construct(private CouponService $couponService) {}

    /** Returns the voucher (creating it once per session/trigger), or null if rule disabled. */
    public function forge(string $trigger, string $sessionToken, ?int $customerId = null, ?Cart $cart = null): ?VoucherOffer
    {
        $rule = VoucherRule::where('trigger', $trigger)->where('active', true)
            ->orderBy('priority')->first();
        if (!$rule) return null;

        // Rate-limit: max_per_session
        $existing = VoucherOffer::where('session_token', $sessionToken)
            ->where('trigger', $trigger)
            ->where(function ($q) {
                $q->whereNull('used_at')->where('expires_at', '>', now());
            })
            ->count();
        if ($existing >= max(1, $rule->max_per_session)) {
            return VoucherOffer::where('session_token', $sessionToken)
                ->where('trigger', $trigger)
                ->orderByDesc('id')->first();
        }

        return $this->mintOffer($rule, $sessionToken, $customerId);
    }

    public function mintOffer(VoucherRule $rule, string $sessionToken, ?int $customerId = null): VoucherOffer
    {
        $code = $this->uniqueCode($rule);

        $offer = VoucherOffer::create([
            'rule_id'      => $rule->id,
            'code'         => $code,
            'session_token'=> $sessionToken,
            'customer_id'  => $customerId,
            'voucher_type' => $rule->voucher_type,
            'value'        => $rule->value,
            'min_subtotal' => $rule->min_subtotal,
            'headline'     => $rule->headline ?: $this->defaultHeadline($rule),
            'subtext'      => $rule->subtext,
            'expires_at'   => now()->addMinutes(max(1, $rule->valid_minutes)),
            'trigger'      => $rule->trigger,
        ]);

        // Mirror into Coupons so it can be applied via existing CouponService
        Coupon::create([
            'code'               => $offer->code,
            'description'        => 'Auto-forged: ' . $rule->name,
            'type'               => $offer->voucher_type,
            'value'              => $offer->value,
            'min_subtotal'       => $offer->min_subtotal,
            'starts_at'          => now(),
            'ends_at'            => $offer->expires_at,
            'usage_limit'        => 1,
            'per_customer_limit' => 1,
            'applies_to'         => 'all',
            'stackable'          => false,
            'active'             => true,
        ]);

        return $offer;
    }

    public function markShown(VoucherOffer $offer): VoucherOffer
    {
        if (!$offer->shown_at) $offer->update(['shown_at' => now()]);
        return $offer;
    }

    public function liveForSession(string $sessionToken): array
    {
        return VoucherOffer::where('session_token', $sessionToken)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')->get()->all();
    }

    private function uniqueCode(VoucherRule $rule): string
    {
        $prefix = match ($rule->voucher_type) {
            'free_shipping' => 'SHIP',
            'percent'       => 'SAVE',
            'fixed'         => 'GIFT',
        };
        do {
            $code = $prefix . Str::upper(Str::random(6));
        } while (Coupon::where('code', $code)->exists());
        return $code;
    }

    private function defaultHeadline(VoucherRule $rule): string
    {
        return match ($rule->voucher_type) {
            'free_shipping' => 'Free shipping unlocked',
            'percent'       => "Here's " . (int) $rule->value . "% off — just for you",
            'fixed'         => "Here's RM" . number_format($rule->value, 2) . " off — just for you",
        };
    }
}
