<?php

namespace App\Services\AI;

use App\Models\Inventory\Product;
use App\Models\Inventory\ProductCategory;
use App\Models\Storefront\AiShopConversation;
use App\Services\Storefront\CartService;
use App\Services\Storefront\CouponService;

/**
 * Anthropic tool-use handlers for the shopping concierge.
 * Each public method matches the `name` of a tool defined in StorefrontAiService.
 */
class StorefrontAiTools
{
    public function __construct(
        private CartService $cartService,
        private CouponService $couponService,
    ) {}

    public static function schemas(): array
    {
        return [
            [
                'name' => 'list_categories',
                'description' => 'List product categories available on the store (e.g. Baju Kurung, Hijab).',
                'input_schema' => ['type' => 'object', 'properties' => new \stdClass(), 'required' => []],
            ],
            [
                'name' => 'list_products',
                'description' => 'List published products with optional filters. Returns at most 8 items.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'category' => ['type' => 'string', 'description' => 'Category slug or name (e.g. baju-kurung, hijab)'],
                        'color'    => ['type' => 'string'],
                        'price_max'=> ['type' => 'number'],
                        'limit'    => ['type' => 'integer', 'maximum' => 8],
                    ],
                    'required' => [],
                ],
            ],
            [
                'name' => 'get_product',
                'description' => 'Get full detail of a product including its variants by slug or id.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => ['slug' => ['type' => 'string']],
                    'required' => ['slug'],
                ],
            ],
            [
                'name' => 'get_size_chart',
                'description' => 'Return the size chart (Markdown) for a product.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => ['product_id' => ['type' => 'integer']],
                    'required' => ['product_id'],
                ],
            ],
            [
                'name' => 'add_to_cart',
                'description' => 'Add a product (and optional variant) to the customer\'s cart.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'product_id' => ['type' => 'integer'],
                        'variant_id' => ['type' => 'integer'],
                        'quantity'   => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                    ],
                    'required' => ['product_id'],
                ],
            ],
            [
                'name' => 'suggest_addon',
                'description' => 'Given an anchor category (e.g. baju-kurung), return complementary products (e.g. matching hijabs).',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => ['anchor_category' => ['type' => 'string']],
                    'required' => ['anchor_category'],
                ],
            ],
            [
                'name' => 'apply_coupon',
                'description' => 'Apply a coupon code to the customer\'s cart.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => ['code' => ['type' => 'string']],
                    'required' => ['code'],
                ],
            ],
            [
                'name' => 'start_checkout',
                'description' => 'Return a checkout URL so the UI can navigate the customer there.',
                'input_schema' => ['type' => 'object', 'properties' => new \stdClass(), 'required' => []],
            ],
        ];
    }

    public function run(string $name, array $input, AiShopConversation $conv): array
    {
        return match ($name) {
            'list_categories' => $this->listCategories(),
            'list_products'   => $this->listProducts($input),
            'get_product'     => $this->getProduct($input),
            'get_size_chart'  => $this->getSizeChart($input),
            'add_to_cart'     => $this->addToCart($input, $conv),
            'suggest_addon'   => $this->suggestAddon($input),
            'apply_coupon'    => $this->applyCoupon($input, $conv),
            'start_checkout'  => $this->startCheckout(),
            default           => ['error' => 'Unknown tool: ' . $name],
        };
    }

    private function listCategories(): array
    {
        $hardcoded = [
            ['slug' => 'baju-kurung', 'name' => 'Baju Kurung'],
            ['slug' => 'hijab',       'name' => 'Hijab'],
            ['slug' => 'new-arrivals','name' => 'New Arrivals'],
        ];
        // Also pull any custom categories with published products
        $custom = Product::where('publish_to_website', true)
            ->whereNotNull('category')
            ->distinct()->pluck('category')
            ->filter()->take(10)
            ->map(fn($c) => ['slug' => str($c)->slug()->toString(), 'name' => $c])
            ->values()->all();
        return ['categories' => array_values(array_unique(array_merge($hardcoded, $custom), SORT_REGULAR))];
    }

    private function listProducts(array $input): array
    {
        $q = Product::where('publish_to_website', true)->where('is_active', true);
        if (!empty($input['category'])) {
            $cat = $input['category'];
            $q->where(function ($x) use ($cat) {
                $x->where('category', $cat)
                  ->orWhere('category', 'LIKE', '%' . str_replace('-', ' ', $cat) . '%')
                  ->orWhere('seo_slug', 'LIKE', $cat . '%');
            });
        }
        if (!empty($input['color']))     $q->where('color', 'LIKE', '%' . $input['color'] . '%');
        if (!empty($input['price_max'])) $q->where('sale_price', '<=', (float) $input['price_max']);
        $limit = min((int)($input['limit'] ?? 6), 8);

        $items = $q->orderByDesc('is_featured')->orderByDesc('id')->limit($limit)->get();

        return [
            'count' => $items->count(),
            'products' => $items->map(fn($p) => [
                'id'    => $p->id,
                'slug'  => $p->seo_slug ?? (string) $p->id,
                'name'  => $p->name,
                'color' => $p->color,
                'price' => $p->sale_price,
                'image' => $p->featured_image_url ?? ($p->gallery_urls[0] ?? null),
            ])->values(),
        ];
    }

    private function getProduct(array $input): array
    {
        $slug = $input['slug'] ?? null;
        $p = Product::with('variants')->where('publish_to_website', true)
            ->where(function ($q) use ($slug) {
                $q->where('seo_slug', $slug)->orWhere('id', $slug);
            })->first();
        if (!$p) return ['error' => 'Product not found'];
        return [
            'id' => $p->id, 'slug' => $p->seo_slug ?? (string) $p->id, 'name' => $p->name,
            'price' => $p->sale_price, 'color' => $p->color,
            'variants' => $p->variants->map(fn($v) => [
                'id' => $v->id, 'color' => $v->color ?? null, 'size' => $v->size ?? null,
                'price' => $v->sale_price ?? $v->price ?? null,
            ])->values(),
        ];
    }

    private function getSizeChart(array $input): array
    {
        $p = Product::find($input['product_id'] ?? 0);
        if (!$p) return ['error' => 'Product not found'];
        return ['product_id' => $p->id, 'size_chart_md' => $p->size_chart_md ?? '(No size chart configured for this product.)'];
    }

    private function addToCart(array $input, AiShopConversation $conv): array
    {
        $cart = $this->cartService->findOrCreate($conv->session_token, $conv->customer);
        $item = $this->cartService->addItem(
            $cart,
            (int) $input['product_id'],
            isset($input['variant_id']) ? (int) $input['variant_id'] : null,
            (float) ($input['quantity'] ?? 1),
        );
        $conv->update(['cart_id' => $cart->id]);
        return [
            'ok' => true,
            'item' => ['name' => $item->name, 'qty' => $item->qty, 'line_total' => $item->line_total],
            'cart_total' => $cart->fresh()->grand_total,
            'item_count' => $cart->items()->count(),
            'ui_action' => ['type' => 'cart_updated'],
        ];
    }

    private function suggestAddon(array $input): array
    {
        $anchor = $input['anchor_category'] ?? '';
        $target = match (true) {
            str_contains($anchor, 'baju')  => 'hijab',
            str_contains($anchor, 'hijab') => 'inner',
            default                        => 'hijab',
        };
        return $this->listProducts(['category' => $target, 'limit' => 4]);
    }

    private function applyCoupon(array $input, AiShopConversation $conv): array
    {
        $cart = $this->cartService->findOrCreate($conv->session_token, $conv->customer);
        $r = $this->couponService->apply($cart, $input['code'] ?? '');
        return [
            'ok' => $r['ok'], 'message' => $r['message'],
            'discount' => $r['discount'], 'cart_total' => $cart->fresh()->grand_total,
        ];
    }

    private function startCheckout(): array
    {
        return ['ui_action' => ['type' => 'navigate', 'url' => '/checkout']];
    }
}
