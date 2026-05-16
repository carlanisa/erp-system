<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingZone extends Model
{
    protected $table = 'storefront_shipping_zones';

    protected $fillable = ['name', 'code', 'state_codes', 'enabled', 'sort_order'];

    protected $casts = [
        'state_codes' => 'array',
        'enabled'     => 'boolean',
    ];

    public function rates(): HasMany
    {
        return $this->hasMany(ShippingRate::class, 'zone_id')->orderBy('sort_order');
    }
}
