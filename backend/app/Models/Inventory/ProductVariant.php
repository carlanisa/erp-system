<?php
namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id','sku','barcode','color','size','variant_label',
        'cost_price','sale_price','original_price','wholesale_price',
        'stock','reserved_stock','reorder_level',
        'weight_kg','image_url','is_active','sort_order',
    ];

    protected $casts = [
        'cost_price'      => 'float',
        'sale_price'      => 'float',
        'original_price'  => 'float',
        'wholesale_price' => 'float',
        'stock'           => 'float',
        'reserved_stock'  => 'float',
        'reorder_level'   => 'float',
        'weight_kg'       => 'float',
        'is_active'       => 'boolean',
    ];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }

    public function locationStocks(): HasMany
    {
        return $this->hasMany(ProductVariantLocation::class, 'product_variant_id');
    }

    /** Available stock = on-hand minus reserved */
    public function getAvailableStockAttribute(): float
    {
        return (float) $this->stock - (float) $this->reserved_stock;
    }

    /** Display name: "Black / M" */
    public function getDisplayNameAttribute(): string
    {
        return collect([$this->color, $this->size, $this->variant_label])->filter()->join(' / ');
    }
}
