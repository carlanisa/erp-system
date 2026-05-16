<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class CrmInvoiceItem extends Model
{
    protected $table = 'crm_invoice_items';
    protected $fillable = [
        'invoice_id','description','item_code','parent_sku','color','size','uom',
        'qty','roll_count','unit_price','discount_pct','discount','tax_pct','line_total',
    ];
    protected $casts = [
        'qty' => 'float','roll_count' => 'float',
        'unit_price' => 'float','discount_pct' => 'float','discount' => 'float',
        'tax_pct' => 'float','line_total' => 'float',
    ];
}
