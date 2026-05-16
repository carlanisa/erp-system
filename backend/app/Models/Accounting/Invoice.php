<?php

namespace App\Models\Accounting;

use App\Models\CRM\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'number', 'customer_id', 'date', 'due_date',
        'status', 'subtotal', 'tax_amount', 'total', 'notes',
    ];

    protected $casts = [
        'date'       => 'date',
        'due_date'   => 'date',
        'subtotal'   => 'float',
        'tax_amount' => 'float',
        'total'      => 'float',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getAmountPaidAttribute(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function getAmountDueAttribute(): float
    {
        return $this->total - $this->amount_paid;
    }
}
