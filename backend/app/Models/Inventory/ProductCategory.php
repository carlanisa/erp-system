<?php

namespace App\Models\Inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductCategory extends Model
{
    protected $fillable = ['name', 'slug', 'parent_id', 'sort_order', 'is_active', 'description'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $cat) {
            if (empty($cat->slug)) {
                $base = Str::slug($cat->name);
                $slug = $base;
                $i    = 1;
                while (self::where('slug', $slug)->where('id', '!=', $cat->id ?? 0)->exists()) {
                    $slug = $base . '-' . (++$i);
                }
                $cat->slug = $slug;
            }
        });
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }
}
