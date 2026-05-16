<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BomLine extends Model
{
    protected $fillable = [
        'bom_id','stock_item_id','account_id','item_code','description','kind','service_name',
        'color','size','roll_count','qty','uom','unit_cost','discount','notes','sort_order',
    ];
    protected $casts = [
        'qty'        => 'float',
        'roll_count' => 'float',
        'unit_cost'  => 'float',
        'discount'   => 'float',
    ];

    public function account(): BelongsTo { return $this->belongsTo(\App\Models\Accounting\Account::class); }

    public function bom(): BelongsTo       { return $this->belongsTo(BomHeader::class, 'bom_id'); }
    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
}
