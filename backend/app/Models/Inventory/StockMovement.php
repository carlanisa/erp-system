<?php
namespace App\Models\Inventory;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockMovement extends Model
{
    protected $fillable = [
        'movement_no','type','date',
        'from_location_id','to_location_id','tailor_id','product_id','bom_id','tailor_order_id',
        'total_qty','total_cost','reference','notes','status','is_cancelled','created_by',
    ];

    protected $casts = [
        'date'         => 'date',
        'total_qty'    => 'float',
        'total_cost'   => 'float',
        'is_cancelled' => 'boolean',
    ];

    public function fromLocation(): BelongsTo { return $this->belongsTo(StockLocation::class, 'from_location_id'); }
    public function toLocation(): BelongsTo   { return $this->belongsTo(StockLocation::class, 'to_location_id'); }
    public function tailor(): BelongsTo       { return $this->belongsTo(Tailor::class); }
    public function product(): BelongsTo      { return $this->belongsTo(Product::class); }
    public function bom(): BelongsTo          { return $this->belongsTo(BomHeader::class, 'bom_id'); }
    public function createdBy(): BelongsTo    { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany          { return $this->hasMany(StockMovementLine::class, 'movement_id')->orderBy('sort_order'); }
}
