<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class CustomTheme extends Model
{
    protected $table = 'storefront_custom_themes';

    protected $fillable = [
        'name', 'slug', 'settings_json', 'sections_json', 'bar_json', 'preview_color', 'saved_by',
    ];

    protected $casts = [
        'settings_json' => 'array',
        'sections_json' => 'array',
        'bar_json'      => 'array',
    ];
}
