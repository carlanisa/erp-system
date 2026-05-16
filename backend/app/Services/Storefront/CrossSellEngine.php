<?php

namespace App\Services\Storefront;

use App\Models\Inventory\Product;
use App\Models\Storefront\Cart;
use App\Models\Storefront\CrossSellRule;

class CrossSellEngine
{
    /**
     * Suggest complementary products for the current cart.
     * Returns an array of suggestion groups:
     *   [{rule_id, reason, products: [...]}]
     */
    public function suggestForCart(Cart $cart, int $limit = 6): array
    {
        $cart->loadMissing('items.product');
        $cartProductIds = $cart->items->pluck('product_id')->all();
        $cartCategories = $cart->items->pluck('product.category')->filter()->unique()->all();

        if (empty($cartProductIds)) return [];

        $rules = CrossSellRule::where('active', true)->orderBy('priority')->get();

        $groups = [];
        $seen = [];
        foreach ($rules as $rule) {
            // Match by anchor
            $matches = false;
            if ($rule->anchor_type === 'product') {
                $matches = in_array((int) $rule->anchor_value, $cartProductIds, true);
            } else {
                // category match (case-insensitive substring)
                foreach ($cartCategories as $c) {
                    if (str_contains(strtolower($c), strtolower($rule->anchor_value)) ||
                        str_contains(strtolower($rule->anchor_value), strtolower($c))) {
                        $matches = true; break;
                    }
                }
            }
            if (!$matches) continue;

            $products = $this->findProducts(
                $rule->suggest_categories ?? [],
                $rule->suggest_product_ids ?? [],
                $cartProductIds,
                $rule->max_suggestions,
            );

            // Dedupe across rules
            $products = array_values(array_filter($products, function ($p) use (&$seen) {
                if (in_array($p['id'], $seen, true)) return false;
                $seen[] = $p['id'];
                return true;
            }));

            if (empty($products)) continue;

            $groups[] = [
                'rule_id' => $rule->id,
                'reason'  => $rule->reason_text ?: 'Complete the look',
                'products'=> $products,
            ];
        }

        // Fallback: featured/new arrivals that aren't in cart
        if (empty($groups)) {
            $fallback = Product::where('publish_to_website', true)
                ->whereNotIn('id', $cartProductIds)
                ->orderByDesc('is_featured')->orderByDesc('id')
                ->limit($limit)->get();
            if ($fallback->isNotEmpty()) {
                $groups[] = [
                    'rule_id' => null,
                    'reason'  => 'You might also like',
                    'products'=> $fallback->map(fn($p) => $this->presentProduct($p))->all(),
                ];
            }
        }

        return $groups;
    }

    public function suggestForProduct(Product $anchor, int $limit = 6): array
    {
        $rules = CrossSellRule::where('active', true)
            ->where(function ($q) use ($anchor) {
                $q->where(function ($x) use ($anchor) {
                    $x->where('anchor_type', 'product')->where('anchor_value', (string) $anchor->id);
                });
                if ($anchor->category) {
                    $q->orWhere(function ($x) use ($anchor) {
                        $x->where('anchor_type', 'category')->where('anchor_value', $anchor->category);
                    });
                }
            })
            ->orderBy('priority')->get();

        $groups = [];
        foreach ($rules as $rule) {
            $products = $this->findProducts(
                $rule->suggest_categories ?? [],
                $rule->suggest_product_ids ?? [],
                [$anchor->id],
                $rule->max_suggestions,
            );
            if (empty($products)) continue;
            $groups[] = [
                'rule_id' => $rule->id,
                'reason'  => $rule->reason_text ?: 'Pairs well with',
                'products'=> $products,
            ];
        }
        return $groups;
    }

    private function findProducts(array $categorySlugs, array $productIds, array $excludeIds, int $limit): array
    {
        $byId = [];
        if (!empty($productIds)) {
            $byId = Product::where('publish_to_website', true)
                ->whereIn('id', $productIds)
                ->whereNotIn('id', $excludeIds)
                ->get();
        }
        $remaining = max(0, $limit - count($byId));
        $byCat = collect();
        if ($remaining > 0 && !empty($categorySlugs)) {
            $byCat = Product::where('publish_to_website', true)
                ->whereNotIn('id', $excludeIds)
                ->where(function ($q) use ($categorySlugs) {
                    foreach ($categorySlugs as $c) {
                        $q->orWhere('category', 'LIKE', '%' . str_replace('-', ' ', $c) . '%');
                    }
                })
                ->orderByDesc('is_featured')->orderByDesc('id')
                ->limit($remaining)->get();
        }
        $all = collect($byId)->concat($byCat)->unique('id')->take($limit);
        return $all->map(fn($p) => $this->presentProduct($p))->values()->all();
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
            'image' => $p->featured_image_url ?? ($p->gallery_urls[0] ?? null),
        ];
    }
}
