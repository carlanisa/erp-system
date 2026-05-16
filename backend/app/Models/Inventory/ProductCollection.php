<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductCollection extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $col) {
            if (empty($col->slug)) {
                $base = Str::slug($col->name);
                $slug = $base;
                $i    = 1;
                while (self::where('slug', $slug)->where('id', '!=', $col->id ?? 0)->exists()) {
                    $slug = $base . '-' . (++$i);
                }
                $col->slug = $slug;
            }
        });
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'collection_id')->orderBy('name');
    }
}
