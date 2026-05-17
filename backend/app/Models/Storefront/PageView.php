<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class PageView extends Model
{
    protected $table = 'storefront_page_views';
    public $timestamps = false;

    protected $fillable = [
        'page_slug', 'page_id', 'session_token', 'customer_id',
        'referrer', 'utm_source', 'utm_medium', 'utm_campaign',
        'user_agent', 'country', 'viewed_at',
    ];

    protected $casts = ['viewed_at' => 'datetime'];
}
