<?php

namespace App\Models\Marketplace;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderPickMismatch extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'marketplace_order_id', 'expected_sku', 'scanned_sku', 'user_id', 'notes', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(MarketplaceOrder::class, 'marketplace_order_id');
    }
}
