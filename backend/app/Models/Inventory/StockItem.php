<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockItem extends Model
{
    protected $fillable = [
        'item_code','name','description','type','department_id','uom',
        'color','size','current_stock','reorder_level','unit_cost',
        'costing_method','is_active',
    ];
    protected $casts = [
        'current_stock' => 'float',
        'reorder_level' => 'float',
        'unit_cost'     => 'float',
        'is_active'     => 'boolean',
    ];

    public function department(): BelongsTo { return $this->belongsTo(StockDepartment::class, 'department_id'); }
    public function bomLines(): HasMany     { return $this->hasMany(BomLine::class); }
}
