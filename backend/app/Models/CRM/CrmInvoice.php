<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmInvoice extends Model
{
    protected $table = 'crm_invoices';
    protected $fillable = [
        'invoice_no','customer_invoice_no','date','due_date','terms','branch_code',
        'customer_id','walk_in_name',
        'subtotal','discount_total','tax_total','amount','paid_amount',
        'payment_method','cheque_number','bank_charges','bank_account_id',
        'reference','agent','area','notes','status','is_cancelled',
    ];
    protected $casts = [
        'date' => 'date','due_date' => 'date',
        'subtotal' => 'float','discount_total' => 'float','tax_total' => 'float',
        'amount' => 'float','paid_amount' => 'float','bank_charges' => 'float',
        'is_cancelled' => 'boolean',
    ];
    protected $appends = ['outstanding','payment_status'];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function items(): HasMany      { return $this->hasMany(CrmInvoiceItem::class, 'invoice_id'); }
    public function payments(): HasMany   { return $this->hasMany(CrmInvoicePayment::class, 'invoice_id')->orderBy('payment_date'); }

    public function getOutstandingAttribute(): float
    {
        return (float) max(0, $this->amount - $this->paid_amount);
    }

    public function getPaymentStatusAttribute(): string
    {
        if ($this->is_cancelled) return 'cancelled';
        if ($this->paid_amount <= 0) return 'unpaid';
        if ($this->paid_amount >= $this->amount && $this->amount > 0) return 'paid';
        return 'partial';
    }
}
