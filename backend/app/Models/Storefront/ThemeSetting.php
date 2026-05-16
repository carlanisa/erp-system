<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class ThemeSetting extends Model
{
    protected $table = 'storefront_theme_settings';

    protected $guarded = ['id'];

    protected $casts = [
        'newsletter_popup_enabled' => 'boolean',
        'extra_json' => 'array',
    ];

    /** There's a single row — auto-create one with defaults if missing. */
    public static function current(): self
    {
        return self::first() ?? self::create([]);
    }
}
