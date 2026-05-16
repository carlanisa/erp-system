<?php

namespace App\Models\Accounting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id', 'description', 'quantity', 'unit_price', 'tax_rate', 'total',
    ];

    protected $casts = [
        'quantity'   => 'float',
        'unit_price' => 'float',
        'tax_rate'   => 'float',
        'total'      => 'float',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
