<?php

namespace App\Models\Storefront;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Page extends Model
{
    protected $table = 'storefront_pages';

    protected $fillable = [
        'slug', 'title', 'meta_title', 'meta_description', 'og_image_url', 'language',
        'is_home', 'is_published', 'sort_order',
    ];

    protected $casts = [
        'is_home'      => 'boolean',
        'is_published' => 'boolean',
    ];

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class)->orderBy('position');
    }

    public static function home(): self
    {
        return self::where('is_home', true)->firstOr(fn() => self::create([
            'slug' => 'home', 'title' => 'Home', 'is_home' => true, 'is_published' => true, 'sort_order' => 0,
        ]));
    }
}
