<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class AnnouncementBar extends Model
{
    protected $table = 'storefront_announcement_bars';

    protected $fillable = [
        'text', 'link_url', 'bg_color', 'text_color',
        'starts_at', 'ends_at', 'active', 'sort_order',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
        'active'    => 'boolean',
    ];

    public function isLive(): bool
    {
        if (!$this->active) return false;
        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) return false;
        if ($this->ends_at && $now->gt($this->ends_at))     return false;
        return true;
    }
}
