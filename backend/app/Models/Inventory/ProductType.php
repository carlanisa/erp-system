<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ProductType extends Model
{
    protected $fillable = ['key', 'label', 'emoji', 'description', 'sort_order', 'is_system', 'is_active'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_system'  => 'boolean',
        'is_active'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $t) {
            if (empty($t->key)) {
                $base = Str::slug($t->label, '_');
                $key  = $base;
                $i    = 1;
                while (self::where('key', $key)->where('id', '!=', $t->id ?? 0)->exists()) {
                    $key = $base . '_' . (++$i);
                }
                $t->key = $key;
            }
        });
    }
}
