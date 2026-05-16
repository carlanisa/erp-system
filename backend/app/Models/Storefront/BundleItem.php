<?php

namespace App\Models\Storefront;

use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BundleItem extends Model
{
    protected $table = 'storefront_bundle_items';

    protected $fillable = [
        'bundle_id', 'product_id', 'variant_id',
        'role', 'default_qty', 'sort_order',
    ];

    public function bundle(): BelongsTo  { return $this->belongsTo(Bundle::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function variant(): BelongsTo { return $this->belongsTo(ProductVariant::class, 'variant_id'); }
}
