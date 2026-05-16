<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'sku', 'barcode', 'gtin', 'mpn',
        'google_product_category', 'fb_product_category',
        'name', 'name_bm', 'description', 'description_short',
        'image_path', 'featured_image_url', 'gallery_urls', 'og_image_url', 'video_url',
        'default_bom_id', 'category', 'department_id', 'collection_id', 'uom',
        'product_type', 'brand', 'tags', 'care_instructions',
        'condition', 'gender', 'age_group', 'material', 'fabrics_used', 'pattern', 'color', 'size_type',
        'cost_price', 'sale_price', 'original_price', 'stock',
        'low_stock_alert', 'costing_method',
        'tax_rate', 'hs_code', 'country_of_origin', 'weight_kg',
        'seo_slug', 'seo_title', 'seo_description', 'focus_keyword', 'secondary_keywords',
        'canonical_url', 'robots', 'twitter_card',
        'is_featured', 'is_bestseller', 'is_new_arrival',
        'sale_starts_at', 'sale_ends_at', 'launch_date',
        'avg_rating', 'review_count',
        'channels', 'status', 'is_active',
        'publish_to_website', 'size_chart_md',
    ];

    protected $casts = [
        'cost_price'         => 'float',
        'sale_price'         => 'float',
        'original_price'     => 'float',
        'stock'              => 'float',
        'low_stock_alert'    => 'float',
        'tax_rate'           => 'float',
        'weight_kg'          => 'float',
        'avg_rating'         => 'float',
        'tags'               => 'array',
        'channels'           => 'array',
        'gallery_urls'       => 'array',
        'secondary_keywords' => 'array',
        'fabrics_used'       => 'array',
        'is_active'          => 'boolean',
        'is_featured'        => 'boolean',
        'is_bestseller'      => 'boolean',
        'is_new_arrival'     => 'boolean',
        'publish_to_website' => 'boolean',
        'sale_starts_at'     => 'datetime',
        'sale_ends_at'       => 'datetime',
        'launch_date'        => 'date',
    ];

    public function department(): BelongsTo  { return $this->belongsTo(StockDepartment::class, 'department_id'); }
    public function collection(): BelongsTo  { return $this->belongsTo(ProductCollection::class, 'collection_id'); }
    public function defaultBom(): BelongsTo { return $this->belongsTo(BomHeader::class, 'default_bom_id'); }
    public function boms(): HasMany         { return $this->hasMany(BomHeader::class); }
    public function variants(): HasMany     { return $this->hasMany(ProductVariant::class)->orderBy('sort_order'); }
    public function locationStocks(): HasMany { return $this->hasMany(ProductLocation::class); }

    /** Aggregate stock from variants (or own stock if no variants) */
    public function getTotalStockAttribute(): float
    {
        $variantStock = (float) $this->variants()->sum('stock');
        return $variantStock > 0 ? $variantStock : (float) $this->stock;
    }

    public function isLowStock(): bool
    {
        return $this->stock <= $this->low_stock_alert;
    }

    public function getStockValueAttribute(): float
    {
        return $this->stock * $this->cost_price;
    }
}
