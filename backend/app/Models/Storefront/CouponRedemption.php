<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponRedemption extends Model
{
    protected $table = 'storefront_coupon_redemptions';
    public $timestamps = false;

    protected $fillable = [
        'coupon_id', 'customer_id', 'order_id', 'amount_discounted', 'redeemed_at',
    ];

    protected $casts = [
        'amount_discounted' => 'float',
        'redeemed_at'       => 'datetime',
    ];

    public function coupon(): BelongsTo { return $this->belongsTo(Coupon::class); }
}
