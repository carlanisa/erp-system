<?php

namespace App\Models\Storefront;

use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $table = 'storefront_cart_items';

    protected $fillable = [
        'cart_id', 'product_id', 'variant_id', 'item_code', 'name',
        'color', 'size', 'qty', 'unit_price', 'line_total', 'options_json',
    ];

    protected $casts = [
        'qty'          => 'float',
        'unit_price'   => 'float',
        'line_total'   => 'float',
        'options_json' => 'array',
    ];

    public function cart(): BelongsTo    { return $this->belongsTo(Cart::class, 'cart_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function variant(): BelongsTo { return $this->belongsTo(ProductVariant::class, 'variant_id'); }
}
