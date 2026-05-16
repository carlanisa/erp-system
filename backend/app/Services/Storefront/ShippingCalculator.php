<?php

namespace App\Services\Storefront;

use App\Models\Storefront\Cart;
use App\Models\Storefront\Coupon;
use App\Models\Storefront\ShippingZone;

class ShippingCalculator
{
    /**
     * @param array{state_code?:string, country?:string} $address
     * @return array{zone_id:?int, zone_name:?string, rate_id:?int, rate_name:?string,
     *               amount:float, free_applied:bool, weight_kg:float, currency:string}
     */
    public function quote(array $address, Cart $cart): array
    {
        $stateCode = $address['state_code'] ?? null;
        $country   = strtoupper($address['country'] ?? 'MY');
        $weight    = $this->cartWeight($cart);

        $zone = $this->findZone($country, $stateCode);
        if (!$zone) {
            return $this->emptyQuote($weight);
        }

        $rate = $this->pickRate($zone, $weight, (float) $cart->subtotal);
        if (!$rate) {
            return $this->emptyQuote($weight, $zone);
        }

        $amount      = (float) $rate->flat_rate;
        $freeApplied = false;

        if ($rate->free_over !== null && $cart->subtotal >= (float) $rate->free_over) {
            $amount      = 0;
            $freeApplied = true;
        }

        if ($cart->coupon_id) {
            $coupon = Coupon::find($cart->coupon_id);
            if ($coupon && $coupon->type === 'free_shipping' && $coupon->isActiveNow()) {
                $amount      = 0;
                $freeApplied = true;
            }
        }

        return [
            'zone_id'      => $zone->id,
            'zone_name'    => $zone->name,
            'rate_id'      => $rate->id,
            'rate_name'    => $rate->name,
            'amount'       => round($amount, 2),
            'free_applied' => $freeApplied,
            'weight_kg'    => round($weight, 3),
            'currency'     => 'MYR',
        ];
    }

    /**
     * Match priority:
     * 1. Zone for this country whose state_codes contains the given state_code (e.g. MY → WM / EM).
     * 2. Zone for this country with empty state_codes (catch-all for the country).
     * 3. Legacy MY zone (no country_code) whose state_codes contains the state_code.
     * 4. Any zone with code='WORLD' / country_code=null catch-all.
     */
    private function findZone(string $country, ?string $stateCode): ?ShippingZone
    {
        $zones = ShippingZone::where('enabled', true)->orderBy('sort_order')->get();

        if ($stateCode) {
            $byCountryAndState = $zones->first(fn($z) =>
                $z->country_code === $country &&
                is_array($z->state_codes) &&
                in_array($stateCode, $z->state_codes)
            );
            if ($byCountryAndState) return $byCountryAndState;
        }

        $byCountry = $zones->first(fn($z) =>
            $z->country_code === $country &&
            (empty($z->state_codes) || !is_array($z->state_codes))
        );
        if ($byCountry) return $byCountry;

        if ($stateCode) {
            $legacy = $zones->first(fn($z) =>
                $z->country_code === null &&
                is_array($z->state_codes) &&
                in_array($stateCode, $z->state_codes)
            );
            if ($legacy) return $legacy;
        }

        return $zones->first(fn($z) => $z->code === 'WORLD');
    }

    /**
     * Pick the first rate that matches: weight in [weight_min, weight_max] (inclusive of max).
     * If a rate has both min/max null it acts as a fallback for any weight.
     */
    private function pickRate(ShippingZone $zone, float $weight, float $subtotal)
    {
        $rates = $zone->rates()->where('enabled', true)->orderBy('sort_order')->get();
        if ($rates->isEmpty()) return null;

        // Prefer weight-bracketed rates
        foreach ($rates as $r) {
            $min = $r->weight_min;
            $max = $r->weight_max;
            if ($min !== null || $max !== null) {
                $okMin = $min === null || $weight >= (float) $min;
                $okMax = $max === null || $weight <= (float) $max;
                if ($okMin && $okMax) return $r;
            }
        }
        // Fallback: first enabled rate (legacy flat rate)
        return $rates->first();
    }

    private function cartWeight(Cart $cart): float
    {
        $total = 0;
        foreach ($cart->items as $item) {
            $product = $item->product;
            $w = $product?->weight_kg ?? 0;
            $total += ((float) $w) * ((float) $item->qty);
        }
        return $total;
    }

    private function emptyQuote(float $weight, ?ShippingZone $zone = null): array
    {
        return [
            'zone_id'      => $zone?->id,
            'zone_name'    => $zone?->name,
            'rate_id'      => null,
            'rate_name'    => null,
            'amount'       => 0,
            'free_applied' => false,
            'weight_kg'    => round($weight, 3),
            'currency'     => 'MYR',
        ];
    }
}
