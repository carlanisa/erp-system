<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class CartSignal extends Model
{
    protected $table = 'storefront_cart_signals';
    public $timestamps = false;
    protected $fillable = ['session_token', 'cart_id', 'customer_id', 'event', 'payload', 'created_at'];
    protected $casts = ['payload' => 'array', 'created_at' => 'datetime'];
}
