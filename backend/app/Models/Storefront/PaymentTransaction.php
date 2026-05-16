<?php

namespace App\Models\Storefront;

use App\Models\Sales\SalesOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $table = 'storefront_payment_transactions';

    protected $fillable = [
        'order_id', 'driver', 'intent_id', 'status', 'amount', 'currency',
        'request_payload', 'response_payload', 'paid_at',
    ];

    protected $casts = [
        'amount'           => 'float',
        'request_payload'  => 'array',
        'response_payload' => 'array',
        'paid_at'          => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'order_id');
    }
}
