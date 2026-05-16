<?php

namespace App\Models\Storefront;

use App\Models\Inventory\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wishlist extends Model
{
    protected $table = 'storefront_wishlists';
    protected $fillable = ['customer_id', 'product_id'];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}
