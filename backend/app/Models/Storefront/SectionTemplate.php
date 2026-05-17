<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class SectionTemplate extends Model
{
    protected $table = 'storefront_section_templates';

    protected $fillable = [
        'name', 'slug', 'description', 'blocks_json',
        'preview_color', 'block_count', 'saved_by',
    ];

    protected $casts = [
        'blocks_json' => 'array',
    ];
}
