<?php

namespace App\Models\Marketplace;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceReturn extends Model
{
    protected $fillable = [
        'marketplace_order_id', 'status', 'reason', 'condition',
        'refund_amount', 'restocked', 'notes',
        'received_at', 'refunded_at', 'processed_by',
    ];

    protected $casts = [
        'refund_amount' => 'float',
        'restocked'     => 'boolean',
        'received_at'   => 'datetime',
        'refunded_at'   => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(MarketplaceOrder::class, 'marketplace_order_id');
    }
}
