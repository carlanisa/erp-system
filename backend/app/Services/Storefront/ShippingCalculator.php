<?php

namespace App\Services\Storefront;

use App\Models\Storefront\Cart;
use App\Models\Storefront\ShippingZone;

class ShippingCalculator
{
    /**
     * @param array{state_code:string, country?:string} $address
     * @return array{zone_id:?int, zone_name:?string, rate_id:?int, rate_name:?string, amount:float, free_applied:bool}
     */
    public function quote(array $address, Cart $cart): array
    {
        $stateCode = $address['state_code'] ?? null;
        if (!$stateCode) {
            return $this->empty();
        }

        $zone = ShippingZone::where('enabled', true)->get()
            ->first(fn($z) => in_array($stateCode, $z->state_codes ?? []));

        if (!$zone) {
            return $this->empty();
        }

        $rate = $zone->rates()->where('enabled', true)->first();
        if (!$rate) {
            return $this->empty();
        }

        $freeApplied = false;
        $amount = (float) $rate->flat_rate;
        if ($rate->free_over !== null && $cart->subtotal >= (float) $rate->free_over) {
            $amount = 0;
            $freeApplied = true;
        }

        return [
            'zone_id'      => $zone->id,
            'zone_name'    => $zone->name,
            'rate_id'      => $rate->id,
            'rate_name'    => $rate->name,
            'amount'       => round($amount, 2),
            'free_applied' => $freeApplied,
        ];
    }

    private function empty(): array
    {
        return [
            'zone_id' => null, 'zone_name' => null, 'rate_id' => null, 'rate_name' => null,
            'amount' => 0, 'free_applied' => false,
        ];
    }
}
