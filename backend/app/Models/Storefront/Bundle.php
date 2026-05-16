<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bundle extends Model
{
    protected $table = 'storefront_bundles';

    protected $fillable = [
        'name', 'slug', 'description', 'image_url',
        'pricing_type', 'discount_value', 'min_items',
        'active', 'sort_order', 'channels',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'active'         => 'boolean',
        'channels'       => 'array',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(BundleItem::class)->orderBy('sort_order');
    }
}
