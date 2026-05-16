<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingRate extends Model
{
    protected $table = 'storefront_shipping_rates';

    protected $fillable = [
        'zone_id', 'name', 'flat_rate', 'free_over',
        'weight_min', 'weight_max', 'enabled', 'sort_order',
    ];

    protected $casts = [
        'flat_rate'  => 'float',
        'free_over'  => 'float',
        'weight_min' => 'float',
        'weight_max' => 'float',
        'enabled'    => 'boolean',
    ];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'zone_id');
    }
}
