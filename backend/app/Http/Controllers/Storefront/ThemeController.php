<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use App\Models\Storefront\AnnouncementBar;
use App\Models\Storefront\Page;
use App\Models\Storefront\Section;
use App\Models\Storefront\ThemeSetting;

class ThemeController extends Controller
{
    /** Home page: settings + ordered enabled sections of the home page + live announcement bar. */
    public function theme()
    {
        $home = Page::home();
        return response()->json($this->buildPagePayload($home));
    }

    /** Any custom page by slug. */
    public function page(string $slug)
    {
        $page = Page::where('slug', $slug)->where('is_published', true)->firstOrFail();
        return response()->json($this->buildPagePayload($page));
    }

    private function buildPagePayload(Page $page): array
    {
        $settings = ThemeSetting::current();
        $sections = Section::where('page_id', $page->id)->where('enabled', true)
            ->orderBy('position')->get()
            ->map(fn($s) => $this->hydrateSection($s));
        $bar = AnnouncementBar::where('active', true)->orderBy('sort_order')->get()
            ->first(fn($b) => $b->isLive());

        return [
            'page'         => [
                'id' => $page->id, 'slug' => $page->slug, 'title' => $page->title,
                'meta_title' => $page->meta_title, 'meta_description' => $page->meta_description,
                'og_image_url' => $page->og_image_url, 'language' => $page->language,
                'is_home' => $page->is_home,
            ],
            'settings'     => $settings,
            'sections'     => $sections,
            'announcement' => $bar,
        ];
    }

    /**
     * Section config may reference products by id. Hydrate them into full data
     * so the frontend doesn't have to chain N requests.
     */
    private function hydrateSection(Section $s): array
    {
        $cfg = $s->config_json ?? [];

        if ($s->type === 'featured_products' && !empty($cfg['product_ids'])) {
            $cfg['products'] = Product::where('publish_to_website', true)
                ->whereIn('id', $cfg['product_ids'])
                ->limit(20)->get()
                ->map(fn($p) => $this->presentProduct($p))->values();
        }

        if ($s->type === 'product_showcase' && !empty($cfg['product_id'])) {
            $p = Product::where('publish_to_website', true)->find($cfg['product_id']);
            if ($p) $cfg['product'] = $this->presentProduct($p);
        }

        if ($s->type === 'featured_products' && empty($cfg['product_ids'])) {
            // fallback: latest published
            $cfg['products'] = Product::where('publish_to_website', true)
                ->orderByDesc('is_featured')->orderByDesc('id')
                ->limit((int) ($cfg['limit'] ?? 8))
                ->get()
                ->map(fn($p) => $this->presentProduct($p))->values();
        }

        return [
            'id'      => $s->id,
            'type'    => $s->type,
            'label'   => $s->label,
            'config'  => $cfg,
        ];
    }

    private function presentProduct(Product $p): array
    {
        return [
            'id'    => $p->id,
            'name'  => $p->name,
            'slug'  => $p->seo_slug ?? (string) $p->id,
            'color' => $p->color,
            'price' => (float) $p->sale_price,
            'original_price' => $p->original_price ? (float) $p->original_price : null,
            'is_featured' => (bool) $p->is_featured,
            'image' => $p->featured_image_url ?? ($p->gallery_urls[0] ?? null),
            'image_alt' => $p->gallery_urls[1] ?? null,
        ];
    }
}
