<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class VoucherRule extends Model
{
    protected $table = 'storefront_voucher_rules';

    protected $fillable = [
        'name', 'trigger', 'voucher_type', 'value',
        'min_subtotal', 'valid_minutes', 'max_per_session',
        'idle_seconds', 'threshold_min',
        'headline', 'subtext', 'active', 'priority',
    ];

    protected $casts = [
        'value'           => 'float',
        'min_subtotal'    => 'float',
        'threshold_min'   => 'float',
        'active'          => 'boolean',
    ];
}
