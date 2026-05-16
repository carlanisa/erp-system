<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    protected $table = 'storefront_payment_methods';

    protected $fillable = ['code', 'driver', 'label', 'enabled', 'config', 'sort_order', 'min_amount', 'max_amount'];

    protected $casts = [
        'enabled'    => 'boolean',
        'config'     => 'array',
        'min_amount' => 'float',
        'max_amount' => 'float',
    ];
}
