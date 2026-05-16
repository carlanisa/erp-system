<?php

namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = ['invoice_id', 'date', 'amount', 'method', 'reference', 'notes'];

    protected $casts = [
        'date'   => 'date',
        'amount' => 'float',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
