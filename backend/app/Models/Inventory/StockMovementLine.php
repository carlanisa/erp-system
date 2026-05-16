<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovementLine extends Model
{
    protected $fillable = [
        'movement_id','stock_item_id','product_id',
        'item_code','description','color','size',
        'qty','uom','unit_cost','total_cost','notes','sort_order',
    ];
    protected $casts = [
        'qty'        => 'float',
        'unit_cost'  => 'float',
        'total_cost' => 'float',
    ];

    public function movement(): BelongsTo  { return $this->belongsTo(StockMovement::class, 'movement_id'); }
    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
    public function product(): BelongsTo   { return $this->belongsTo(Product::class); }
}
