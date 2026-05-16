<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class QuotationItem extends Model
{
    protected $table = 'crm_quotation_items';
    protected $fillable = ['quotation_id','description','qty','unit_price','discount_pct','tax_pct','line_total'];
    protected $casts = [
        'qty' => 'float','unit_price' => 'float',
        'discount_pct' => 'float','tax_pct' => 'float','line_total' => 'float',
    ];
}
