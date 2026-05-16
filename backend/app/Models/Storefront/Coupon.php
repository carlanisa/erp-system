<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    protected $table = 'storefront_coupons';

    protected $fillable = [
        'code', 'description', 'type', 'value', 'min_subtotal',
        'starts_at', 'ends_at', 'usage_limit', 'per_customer_limit',
        'applies_to', 'target_ids', 'stackable', 'active', 'redeem_count',
    ];

    protected $casts = [
        'value'        => 'float',
        'min_subtotal' => 'float',
        'target_ids'   => 'array',
        'stackable'    => 'boolean',
        'active'       => 'boolean',
        'starts_at'    => 'datetime',
        'ends_at'      => 'datetime',
    ];

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function isActiveNow(): bool
    {
        if (!$this->active) return false;
        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) return false;
        if ($this->ends_at && $now->gt($this->ends_at)) return false;
        if ($this->usage_limit && $this->redeem_count >= $this->usage_limit) return false;
        return true;
    }
}
