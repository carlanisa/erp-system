<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class CrossSellRule extends Model
{
    protected $table = 'storefront_cross_sell_rules';

    protected $fillable = [
        'name', 'anchor_type', 'anchor_value',
        'suggest_categories', 'suggest_product_ids',
        'reason_text', 'max_suggestions', 'priority', 'active',
    ];

    protected $casts = [
        'suggest_categories'  => 'array',
        'suggest_product_ids' => 'array',
        'active'              => 'boolean',
    ];
}
