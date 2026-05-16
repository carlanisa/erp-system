<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    protected $table = 'storefront_sections';

    protected $fillable = ['type', 'label', 'position', 'enabled', 'config_json'];

    protected $casts = [
        'enabled'     => 'boolean',
        'config_json' => 'array',
    ];
}
