<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TailorOrderLine extends Model
{
    protected $fillable = [
        'tailor_order_id','kind','stock_item_id','account_id','item_code','description',
        'service_name','color','size','roll_count',
        'qty','uom','unit_cost','discount','total_cost','notes','sort_order','avg_per_piece',
    ];
    protected $casts = [
        'qty'           => 'float',
        'roll_count'    => 'float',
        'unit_cost'     => 'float',
        'discount'      => 'float',
        'total_cost'    => 'float',
        'avg_per_piece' => 'float',
    ];

    public function order(): BelongsTo     { return $this->belongsTo(TailorOrder::class, 'tailor_order_id'); }
    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
    public function account(): BelongsTo   { return $this->belongsTo(\App\Models\Accounting\Account::class); }
}
