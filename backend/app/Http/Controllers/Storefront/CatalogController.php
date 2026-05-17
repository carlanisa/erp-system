<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductCategory;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function products(Request $request)
    {
        // is_active filter dropped — bulk publish auto-activates products,
        // and being too strict here was hiding everything legitimately published.
        $q = Product::query()->where('publish_to_website', true);

        if ($category = $request->query('category')) {
            // Be lenient: admin may have stored "Baju Kurung" but the link uses
            // /collections/baju-kurung, so match name OR slug OR substring.
            $catLower = strtolower(str_replace('-', ' ', $category));
            $q->where(function ($x) use ($category, $catLower) {
                $x->where('category', $category)
                  ->orWhereRaw('LOWER(category) = ?', [$catLower])
                  ->orWhere('category', 'ILIKE', '%' . $catLower . '%');
            });
        }
        if ($search = $request->query('q')) {
            $q->where('name', 'ILIKE', "%{$search}%");
        }
        if ($color = $request->query('color')) {
            $q->where('color', $color);
        }
        if ($priceMax = $request->query('price_max')) {
            $q->where('sale_price', '<=', (float) $priceMax);
        }
        if ($request->boolean('featured')) {
            $q->where('is_featured', true);
        }

        $perPage = min((int) $request->query('limit', 24), 60);
        $products = $q->orderByDesc('is_featured')->orderByDesc('id')->paginate($perPage);

        return response()->json($products);
    }

    public function product(string $slug)
    {
        $product = Product::with('variants')
            ->where('publish_to_website', true)
            ->where(function ($q) use ($slug) {
                $q->where('seo_slug', $slug)->orWhere('id', $slug);
            })
            ->firstOrFail();

        return response()->json([
            'product' => $product,
            'variants' => $product->variants,
            'size_chart_md' => $product->size_chart_md,
        ]);
    }

    public function categories()
    {
        $categories = ProductCategory::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);
        return response()->json($categories);
    }
}
