<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmInvoicePayment extends Model
{
    protected $table = 'crm_invoice_payments';
    protected $fillable = [
        'invoice_id','account_id','payee','code','payment_date','amount',
        'payment_method','cheque_number','reference','notes',
    ];
    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'float',
    ];

    public function invoice(): BelongsTo { return $this->belongsTo(CrmInvoice::class, 'invoice_id'); }
}
