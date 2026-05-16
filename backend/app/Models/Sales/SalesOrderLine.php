<?php
namespace App\Models\Sales;

use App\Models\Accounting\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderLine extends Model
{
    protected $fillable = [
        'sales_order_id','account_id','item_code','description','color','size',
        'qty','qty_invoiced','uom','unit_price','discount','tax_rate','tax_amount',
        'amount','sort_order',
    ];

    protected $casts = [
        'qty'          => 'float',
        'qty_invoiced' => 'float',
        'unit_price'   => 'float',
        'discount'     => 'float',
        'tax_rate'     => 'float',
        'tax_amount'   => 'float',
        'amount'       => 'float',
    ];

    public function salesOrder(): BelongsTo { return $this->belongsTo(SalesOrder::class); }
    public function account(): BelongsTo    { return $this->belongsTo(Account::class); }
}
