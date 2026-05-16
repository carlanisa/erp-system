<?php
namespace App\Models\Sales;

use App\Models\Accounting\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleInvoiceLine extends Model
{
    protected $fillable = [
        'sale_invoice_id','account_id','item_code','description','color','size',
        'qty','roll_count','uom','unit_price','discount','tax_rate','tax_amount',
        'amount','sort_order',
    ];

    protected $casts = [
        'qty'        => 'float',
        'roll_count' => 'float',
        'unit_price' => 'float',
        'discount'   => 'float',
        'tax_rate'   => 'float',
        'tax_amount' => 'float',
        'amount'     => 'float',
    ];

    public function saleInvoice(): BelongsTo { return $this->belongsTo(SaleInvoice::class); }
    public function account(): BelongsTo     { return $this->belongsTo(Account::class); }
}
