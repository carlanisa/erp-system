<?php

namespace App\Models\Storefront;

use App\Models\CRM\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $table = 'storefront_carts';

    protected $fillable = [
        'customer_id', 'session_token', 'currency',
        'subtotal', 'discount_total', 'shipping_total', 'tax_total', 'grand_total',
        'coupon_id', 'coupon_code', 'shipping_zone_id', 'status', 'expires_at',
    ];

    protected $casts = [
        'subtotal'       => 'float',
        'discount_total' => 'float',
        'shipping_total' => 'float',
        'tax_total'      => 'float',
        'grand_total'    => 'float',
        'expires_at'     => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class, 'cart_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
