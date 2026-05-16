<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingZone extends Model
{
    protected $table = 'storefront_shipping_zones';

    protected $fillable = [
        'name', 'code', 'country_code', 'state_codes',
        'courier', 'courier_config', 'enabled', 'sort_order',
    ];

    protected $casts = [
        'state_codes'    => 'array',
        'courier_config' => 'array',
        'enabled'        => 'boolean',
    ];

    /** Hide secrets from API responses. */
    protected $hidden = ['courier_config'];

    public function rates(): HasMany
    {
        return $this->hasMany(ShippingRate::class, 'zone_id')->orderBy('sort_order');
    }
}
