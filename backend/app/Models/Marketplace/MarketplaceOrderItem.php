<?php

namespace App\Models\Marketplace;

use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceOrderItem extends Model
{
    protected $fillable = [
        'marketplace_order_id', 'product_id', 'product_variant_id',
        'external_sku', 'external_variant_name', 'name_snapshot', 'image_url',
        'qty', 'unit_price', 'scanned_sku', 'picked_at', 'picked_by',
    ];

    protected $casts = [
        'unit_price' => 'float',
        'qty'        => 'integer',
        'picked_at'  => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(MarketplaceOrder::class, 'marketplace_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
