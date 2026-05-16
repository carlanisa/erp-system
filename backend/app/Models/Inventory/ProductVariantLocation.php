<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariantLocation extends Model
{
    protected $fillable = ['product_variant_id', 'stock_location_id', 'qty'];
    protected $casts    = ['qty' => 'float'];

    public function variant(): BelongsTo  { return $this->belongsTo(ProductVariant::class, 'product_variant_id'); }
    public function location(): BelongsTo { return $this->belongsTo(StockLocation::class, 'stock_location_id'); }
}
