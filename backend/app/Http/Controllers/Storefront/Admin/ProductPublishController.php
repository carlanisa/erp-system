<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductPublishController extends Controller
{
    /** Single-product publish + SEO update. */
    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $data = $request->validate([
            'publish_to_website' => 'required|boolean',
            'seo_slug'           => 'nullable|string|max:200',
            'seo_title'          => 'nullable|string|max:200',
            'seo_description'    => 'nullable|string|max:500',
            'size_chart_md'      => 'nullable|string',
        ]);

        $this->applyPublish($product, $data);
        $product->save();
        return response()->json($product);
    }

    /** Bulk publish/unpublish. Auto-activates + auto-slugs in one call. */
    public function bulk(Request $request)
    {
        $data = $request->validate([
            'ids'                => 'required|array|min:1',
            'ids.*'              => 'integer',
            'publish_to_website' => 'required|boolean',
        ]);

        $products = Product::whereIn('id', $data['ids'])->get();
        $changed = 0; $activated = 0; $sluggedNow = 0;
        foreach ($products as $p) {
            $wasActive = (bool) $p->is_active;
            $hadSlug   = !empty($p->seo_slug);
            $this->applyPublish($p, ['publish_to_website' => $data['publish_to_website']]);
            $p->save();
            $changed++;
            if (!$wasActive && $p->is_active) $activated++;
            if (!$hadSlug && !empty($p->seo_slug)) $sluggedNow++;
        }
        return response()->json([
            'ok' => true,
            'changed' => $changed,
            'activated' => $activated,
            'auto_slugged' => $sluggedNow,
        ]);
    }

    /** Storefront-readiness diagnostic. */
    public function stats()
    {
        $total = Product::count();
        $published = Product::where('publish_to_website', true)->count();
        $active = Product::where('publish_to_website', true)->where('is_active', true)->count();
        $withImage = Product::where('publish_to_website', true)
            ->where(function ($q) {
                $q->whereNotNull('featured_image_url')->orWhereNotNull('image_path');
            })->count();
        $withSlug = Product::where('publish_to_website', true)->whereNotNull('seo_slug')->count();
        return response()->json([
            'total'                 => $total,
            'published'             => $published,
            'published_active'      => $active,
            'published_with_image'  => $withImage,
            'published_with_slug'   => $withSlug,
        ]);
    }

    /**
     * Side effects on publish=true:
     *  - is_active = true (else storefront filter hides it)
     *  - seo_slug auto-generated from name if missing (else /products/{slug} breaks)
     *  - channels[] gets 'web' added
     */
    private function applyPublish(Product $product, array $data): void
    {
        $channels = $product->channels ?? [];
        if ($data['publish_to_website']) {
            if (!in_array('web', $channels)) $channels[] = 'web';
            if (!$product->is_active) $product->is_active = true;
            if (empty($data['seo_slug'] ?? null) && empty($product->seo_slug)) {
                $base = Str::slug($product->name) ?: ('product-' . $product->id);
                $slug = $base; $i = 2;
                while (Product::where('seo_slug', $slug)->where('id', '!=', $product->id)->exists()) {
                    $slug = "$base-$i"; $i++;
                }
                $product->seo_slug = $slug;
            }
        } else {
            $channels = array_values(array_filter($channels, fn($c) => $c !== 'web'));
        }
        $product->channels = $channels;
        $product->fill($data);
    }
}
