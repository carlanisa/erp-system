<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $table = 'crm_quotations';
    protected $fillable = [
        'quote_no','date','valid_until','customer_id','lead_id','walk_in_name',
        'subtotal','discount_total','tax_total','amount','status','terms','notes','owner_user_id',
    ];
    protected $casts = [
        'date' => 'date','valid_until' => 'date',
        'subtotal' => 'float','discount_total' => 'float','tax_total' => 'float','amount' => 'float',
    ];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function lead(): BelongsTo     { return $this->belongsTo(Lead::class); }
    public function items(): HasMany      { return $this->hasMany(QuotationItem::class, 'quotation_id'); }
}
