<?php

namespace App\Models\Marketplace;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceChannel extends Model
{
    protected $fillable = [
        'code', 'name', 'region', 'color', 'credentials',
        'is_active', 'is_connected', 'last_synced_at',
    ];

    protected $casts = [
        'credentials'     => 'encrypted:array',
        'is_active'       => 'boolean',
        'is_connected'    => 'boolean',
        'last_synced_at'  => 'datetime',
    ];

    protected $hidden = ['credentials'];

    public function orders(): HasMany
    {
        return $this->hasMany(MarketplaceOrder::class, 'channel_id');
    }
}
