<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    protected $table = 'storefront_menu_items';
    protected $fillable = [
        'menu_id', 'parent_id', 'label',
        'link_type', 'link_value', 'open_in_new_tab', 'sort_order',
    ];

    protected $casts = ['open_in_new_tab' => 'boolean'];

    /** Resolve link_type + link_value into a usable href (Shopify-style URL pattern). */
    public function getHrefAttribute(): string
    {
        return match ($this->link_type) {
            'page'     => '/p/' . $this->link_value,
            'product'  => '/products/' . $this->link_value,
            'category' => '/collections/' . $this->link_value,
            default    => $this->link_value ?? '#',
        };
    }
}
