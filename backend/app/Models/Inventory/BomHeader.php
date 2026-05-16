<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;

class BomHeader extends Model
{
    protected $table = 'bom_headers';
    protected $fillable = [
        'bom_number','product_id','version','is_active',
        'output_qty','output_uom','notes','created_by',
    ];
    protected $casts = [
        'is_active'  => 'boolean',
        'output_qty' => 'float',
    ];

    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function createdBy(): BelongsTo{ return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany      { return $this->hasMany(BomLine::class, 'bom_id')->orderBy('sort_order'); }
}
