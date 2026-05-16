<?php

namespace App\Models\Marketplace;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceOrder extends Model
{
    protected $fillable = [
        'channel_id', 'external_order_id', 'external_order_sn',
        'buyer_name', 'buyer_phone', 'ship_address',
        'status', 'payment_status', 'currency',
        'subtotal', 'shipping_fee', 'total',
        'awb_no', 'courier', 'awb_pdf_path',
        'ship_by_date', 'weight_kg',
        'raw_payload', 'placed_at', 'packed_at', 'packed_by',
    ];

    protected $casts = [
        'ship_address'  => 'array',
        'raw_payload'   => 'array',
        'subtotal'      => 'float',
        'shipping_fee'  => 'float',
        'total'         => 'float',
        'weight_kg'     => 'float',
        'ship_by_date'  => 'date',
        'placed_at'     => 'datetime',
        'packed_at'     => 'datetime',
    ];

    public function channel(): BelongsTo
    {
        return $this->belongsTo(MarketplaceChannel::class, 'channel_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MarketplaceOrderItem::class);
    }

    public function mismatches(): HasMany
    {
        return $this->hasMany(OrderPickMismatch::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(MarketplaceReturn::class);
    }
}
