<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use App\Services\ProductAiAutofill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $products = Product::with(['variants','department'])
            ->when($request->search, fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku',  'like', "%{$request->search}%")
                  ->orWhere('barcode', 'like', "%{$request->search}%")
                  ->orWhereHas('variants', fn($vq) => $vq->where('sku', 'like', "%{$request->search}%")
                                                        ->orWhere('barcode', 'like', "%{$request->search}%")))
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->when($request->product_type, fn($q) => $q->where('product_type', $request->product_type))
            ->when($request->low_stock === 'true', fn($q) => $q->whereColumn('stock', '<=', 'low_stock_alert'))
            ->when($request->active !== 'false', fn($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->paginate(min((int) ($request->per_page ?: 20), 500));

        return $this->paginated($products);
    }

    public function categories(): JsonResponse
    {
        $cats = Product::whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return $this->success($cats);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $product = DB::transaction(function () use ($data, $request) {
            $variants = $data['variants'] ?? [];
            unset($data['variants']);

            $data['sku'] = $data['sku'] ?? $this->nextSku($data['product_type'] ?? 'apparel');
            $product = Product::create($data);

            foreach ($variants as $i => $v) {
                $product->variants()->create($this->prepVariant($product, $v, $i));
            }
            return $product;
        });

        return $this->success($product->fresh(['variants','department']), 'Product created', 201);
    }

    public function show(Product $product): JsonResponse
    {
        return $this->success($product->load(['variants','department','defaultBom.lines.stockItem']));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validatePayload($request, true);

        DB::transaction(function () use ($data, $product) {
            $variants = $data['variants'] ?? null;
            unset($data['variants']);

            $product->update($data);

            // Smart sync: keep IDs, update existing, create new, delete missing
            if ($variants !== null) {
                $existingIds = $product->variants()->pluck('id')->all();
                $keptIds = [];
                foreach ($variants as $i => $v) {
                    if (!empty($v['id'])) {
                        $variant = ProductVariant::where('product_id', $product->id)->where('id', $v['id'])->first();
                        if ($variant) {
                            $variant->update($this->prepVariant($product, $v, $i));
                            $keptIds[] = $variant->id;
                        }
                    } else {
                        $created = $product->variants()->create($this->prepVariant($product, $v, $i));
                        $keptIds[] = $created->id;
                    }
                }
                ProductVariant::where('product_id', $product->id)->whereNotIn('id', $keptIds)->delete();
            }
        });

        return $this->success($product->fresh(['variants','department']), 'Product updated');
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->update(['is_active' => false, 'status' => 'archived']);
        return $this->success(null, 'Product archived');
    }

    /**
     * Bulk-generate variants from a colors × sizes matrix.
     * POST /products/{product}/generate-variants
     * Body: { colors: ["Black","Maroon"], sizes: ["XS","S","M","L","XL","2XL"], cost_price, sale_price, original_price }
     */
    public function generateVariants(Product $product, Request $request): JsonResponse
    {
        $data = $request->validate([
            'colors'         => 'required|array|min:1',
            'colors.*'       => 'string|max:60',
            'sizes'          => 'array',
            'sizes.*'        => 'string|max:30',
            'cost_price'     => 'nullable|numeric|min:0',
            'sale_price'     => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'stock'          => 'nullable|numeric|min:0',
            'reorder_level'  => 'nullable|numeric|min:0',
            'replace'        => 'boolean',
        ]);

        $sizes = !empty($data['sizes']) ? $data['sizes'] : [null];
        $created = DB::transaction(function () use ($product, $data, $sizes) {
            if (!empty($data['replace'])) $product->variants()->delete();

            $existing = $product->variants()->get()->keyBy(fn($v) => "{$v->color}|{$v->size}");
            $sortBase = $product->variants()->max('sort_order') ?? 0;
            $list = [];
            $i = 0;
            foreach ($data['colors'] as $color) {
                foreach ($sizes as $size) {
                    $key = "{$color}|" . ($size ?? '');
                    if (isset($existing[$key])) continue;     // skip duplicates
                    $sku  = $this->buildVariantSku($product->sku, $color, $size);
                    $list[] = $product->variants()->create([
                        'sku'            => $this->ensureUniqueSku($sku),
                        'color'          => $color,
                        'size'           => $size,
                        'cost_price'     => $data['cost_price']     ?? $product->cost_price ?? 0,
                        'sale_price'     => $data['sale_price']     ?? $product->sale_price ?? 0,
                        'original_price' => $data['original_price'] ?? $product->original_price ?? 0,
                        'stock'          => $data['stock']          ?? 0,
                        'reorder_level'  => $data['reorder_level']  ?? $product->low_stock_alert ?? 0,
                        'sort_order'     => $sortBase + (++$i),
                        'is_active'      => true,
                    ]);
                }
            }
            return $list;
        });

        return $this->success(['count' => count($created), 'variants' => $created], "Generated " . count($created) . " variants");
    }

    /* ─── helpers ─────────────────────────────────────────── */

    private function validatePayload(Request $request, bool $update = false): array
    {
        $req = $update ? 'sometimes|' : '';

        // Exclude soft-deleted products from SKU uniqueness check
        $skuRule = Rule::unique('products', 'sku')->whereNull('deleted_at');
        if ($update && $request->route('product')) {
            $skuRule = $skuRule->ignore($request->route('product')->id);
        }

        return $request->validate([
            'sku'             => [$req . 'nullable', 'string', $skuRule],
            'barcode'         => 'nullable|string|max:60',
            'gtin'            => 'nullable|string|max:20',
            'mpn'             => 'nullable|string|max:60',
            'google_product_category' => 'nullable|string|max:255',
            'fb_product_category'     => 'nullable|string|max:255',
            'name'            => $req . 'required|string|max:255',
            'name_bm'         => 'nullable|string|max:255',
            'description'     => 'nullable|string',
            'description_short'=> 'nullable|string',
            'category'        => 'nullable|string|max:100',
            'department_id'   => 'nullable|exists:stock_departments,id',
            'uom'             => 'nullable|string|max:20',
            'product_type'    => 'nullable|string|exists:product_types,key',
            'brand'           => 'nullable|string|max:100',
            'tags'            => 'nullable|array',
            'tags.*'          => 'string|max:50',
            'care_instructions'=> 'nullable|string',
            'condition'       => 'nullable|in:new,refurbished,used',
            'gender'          => 'nullable|in:female,male,unisex',
            'age_group'       => 'nullable|in:adult,kids,teen,toddler,newborn',
            'material'        => 'nullable|string|max:100',
            'fabrics_used'                  => 'nullable|array',
            'fabrics_used.*.sku'            => 'nullable|string|max:120',
            'fabrics_used.*.name'           => 'nullable|string|max:255',
            'fabrics_used.*.qty_per_piece'  => 'nullable|numeric|min:0',
            'fabrics_used.*.uom'            => 'nullable|string|max:20',
            'fabrics_used.*.color'          => 'nullable|string|max:80',
            'pattern'         => 'nullable|string|max:100',
            'color'           => 'nullable|string|max:100',
            'size_type'       => 'nullable|in:regular,petite,plus,tall,maternity',
            'featured_image_url' => 'nullable|string|max:500',
            'gallery_urls'    => 'nullable|array',
            'gallery_urls.*'  => 'string|max:500',
            'og_image_url'    => 'nullable|string|max:500',
            'video_url'       => 'nullable|string|max:500',
            'cost_price'      => 'nullable|numeric|min:0',
            'sale_price'      => 'nullable|numeric|min:0',
            'original_price'  => 'nullable|numeric|min:0',
            'stock'           => 'nullable|numeric|min:0',
            'low_stock_alert' => 'nullable|numeric|min:0',
            'costing_method'  => 'in:fifo,lifo,average',
            'tax_rate'        => 'nullable|numeric|min:0|max:100',
            'hs_code'         => 'nullable|string|max:30',
            'country_of_origin'=> 'nullable|string|max:60',
            'weight_kg'       => 'nullable|numeric|min:0',
            'seo_slug'        => 'nullable|string|max:255',
            'seo_title'       => 'nullable|string|max:255',
            'seo_description' => 'nullable|string',
            'focus_keyword'   => 'nullable|string|max:100',
            'secondary_keywords' => 'nullable|array',
            'secondary_keywords.*' => 'string|max:80',
            'canonical_url'   => 'nullable|string|max:500',
            'robots'          => 'nullable|string|max:50',
            'twitter_card'    => 'nullable|string|max:30',
            'is_featured'     => 'boolean',
            'is_bestseller'   => 'boolean',
            'is_new_arrival'  => 'boolean',
            'sale_starts_at'  => 'nullable|date',
            'sale_ends_at'    => 'nullable|date',
            'launch_date'     => 'nullable|date',
            'channels'        => 'nullable|array',
            'channels.*'      => 'string|max:30',
            'status'          => 'in:draft,active,archived',
            'is_active'       => 'boolean',

            'variants'                  => 'nullable|array',
            'variants.*.id'             => 'nullable|exists:product_variants,id',
            'variants.*.sku'            => 'nullable|string|max:60',
            'variants.*.barcode'        => 'nullable|string|max:60',
            'variants.*.color'          => 'nullable|string|max:60',
            'variants.*.size'           => 'nullable|string|max:30',
            'variants.*.variant_label'  => 'nullable|string|max:60',
            'variants.*.cost_price'     => 'nullable|numeric|min:0',
            'variants.*.sale_price'     => 'nullable|numeric|min:0',
            'variants.*.original_price' => 'nullable|numeric|min:0',
            'variants.*.wholesale_price'=> 'nullable|numeric|min:0',
            'variants.*.stock'          => 'nullable|numeric|min:0',
            'variants.*.reorder_level'  => 'nullable|numeric|min:0',
            'variants.*.weight_kg'      => 'nullable|numeric|min:0',
            'variants.*.image_url'      => 'nullable|string|max:500',
            'variants.*.is_active'      => 'boolean',
        ]);
    }

    private function prepVariant(Product $product, array $v, int $i): array
    {
        $sku = $v['sku'] ?? null;
        if (!$sku) $sku = $this->buildVariantSku($product->sku, $v['color'] ?? null, $v['size'] ?? null);
        $sku = $this->ensureUniqueSku($sku, $v['id'] ?? null);

        return [
            'sku'            => $sku,
            'barcode'        => $v['barcode'] ?? null,
            'color'          => $v['color'] ?? null,
            'size'           => $v['size'] ?? null,
            'variant_label'  => $v['variant_label'] ?? null,
            'cost_price'     => $v['cost_price']     ?? 0,
            'sale_price'     => $v['sale_price']     ?? 0,
            'original_price' => $v['original_price'] ?? 0,
            'wholesale_price'=> $v['wholesale_price']?? 0,
            'stock'          => $v['stock']          ?? 0,
            'reorder_level'  => $v['reorder_level']  ?? 0,
            'weight_kg'      => $v['weight_kg']      ?? null,
            'image_url'      => $v['image_url']      ?? null,
            'is_active'      => $v['is_active']      ?? true,
            'sort_order'     => $i,
        ];
    }

    private function buildVariantSku(string $baseSku, ?string $color, ?string $size): string
    {
        $parts = [strtoupper($baseSku)];
        if ($color) $parts[] = strtoupper(substr(preg_replace('/[^A-Z0-9]/i', '', $color), 0, 4));
        if ($size)  $parts[] = strtoupper($size);
        return implode('-', $parts);
    }

    private function ensureUniqueSku(string $base, ?int $skipId = null): string
    {
        $sku = $base;
        $i = 2;
        while (ProductVariant::where('sku', $sku)->when($skipId, fn($q) => $q->where('id', '!=', $skipId))->exists()
            || Product::where('sku', $sku)->exists()) {
            $sku = $base . '-' . $i++;
        }
        return $sku;
    }

    private function nextSku(string $type): string
    {
        $prefix = match ($type) {
            'apparel'      => 'APP-',
            'fabric'       => 'FAB-',
            'accessory'    => 'ACC-',
            'raw_material' => 'RAW-',
            default        => 'PRD-',
        };
        $next = (Product::where('sku', 'like', "$prefix%")->count()) + 1;
        $sku  = $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        while (Product::where('sku', $sku)->exists()) {
            $next++; $sku = $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        }
        return $sku;
    }

    public function stats(): JsonResponse
    {
        return $this->success([
            'total'      => Product::where('is_active', true)->count(),
            'low_stock'  => Product::where('is_active', true)->whereColumn('stock', '<=', 'low_stock_alert')->count(),
            'out_of_stock' => Product::where('is_active', true)->where('stock', 0)->count(),
            'total_value'  => Product::where('is_active', true)->selectRaw('SUM(stock * cost_price) as val')->value('val') ?? 0,
            'categories' => Product::whereNotNull('category')->distinct()->count('category'),
        ]);
    }

    /**
     * AI Auto-Fill: given product name + minimal context, fill in all
     * marketing/SEO/Google-Merchant fields via Anthropic Claude.
     * Falls back to heuristic detection if API key not configured.
     */
    public function aiFill(Request $request, ProductAiAutofill $ai): JsonResponse
    {
        $context = $request->validate([
            'name'         => 'required|string|max:255',
            'product_type' => 'nullable|string|exists:product_types,key',
            'brand'        => 'nullable|string|max:100',
            'category'     => 'nullable|string|max:100',
            'color'        => 'nullable|string|max:60',
            'description'  => 'nullable|string',
        ]);

        $result = $ai->fillFields($context);
        return $this->success([
            'fields'    => $result['data'],
            'fallback'  => $result['fallback'] ?? false,
            'message'   => $result['message'] ?? '',
        ], $result['ok'] ? 'AI fill complete' : 'Used heuristic fallback');
    }

    /**
     * Generate Schema.org JSON-LD + OG tags + Twitter Card metadata for a product.
     * Used by storefront pages OR can be copy-pasted into product page <head>.
     */
    public function schema(Product $product): JsonResponse
    {
        $product->load('variants');
        $brandName = $product->brand ?: 'CARLANISA';
        $base      = config('app.url', 'https://carlanisa.com');
        $url       = $product->canonical_url ?: ($base . '/product/' . ($product->seo_slug ?: $product->id));
        $img       = $product->featured_image_url ?: $product->og_image_url ?: $product->image_path;
        $images    = collect([$img])
            ->merge($product->gallery_urls ?? [])
            ->filter()->unique()->values()->all();

        $hasVariants = $product->variants->count() > 0;

        // Build offers (single-offer or AggregateOffer for variants)
        if ($hasVariants) {
            $prices = $product->variants->pluck('sale_price')->filter(fn ($p) => $p > 0);
            $offer = [
                '@type'         => 'AggregateOffer',
                'priceCurrency' => 'MYR',
                'lowPrice'      => $prices->min() ?? $product->sale_price,
                'highPrice'     => $prices->max() ?? $product->sale_price,
                'offerCount'    => $product->variants->count(),
                'availability'  => 'https://schema.org/InStock',
                'url'           => $url,
            ];
        } else {
            $offer = [
                '@type'         => 'Offer',
                'priceCurrency' => 'MYR',
                'price'         => $product->sale_price,
                'priceValidUntil' => optional($product->sale_ends_at)?->format('Y-m-d'),
                'availability'  => $product->stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                'itemCondition' => 'https://schema.org/' . ucfirst(($product->condition ?? 'new')) . 'Condition',
                'url'           => $url,
            ];
        }

        $jsonLd = array_filter([
            '@context'    => 'https://schema.org/',
            '@type'       => 'Product',
            'name'        => $product->name,
            'description' => $product->seo_description ?: $product->description_short ?: strip_tags((string) $product->description),
            'image'       => count($images) ? $images : null,
            'sku'         => $product->sku,
            'mpn'         => $product->mpn,
            'gtin13'      => $product->gtin && strlen($product->gtin) === 13 ? $product->gtin : null,
            'gtin'        => $product->gtin,
            'brand'       => ['@type' => 'Brand', 'name' => $brandName],
            'category'    => $product->google_product_category ?: $product->category,
            'color'       => $product->color,
            'material'    => $product->material,
            'audience'    => $product->gender || $product->age_group ? array_filter([
                '@type'                  => 'PeopleAudience',
                'suggestedGender'        => $product->gender,
                'suggestedMinAge'        => null,
            ]) : null,
            'offers'      => $offer,
            'aggregateRating' => $product->review_count > 0 ? [
                '@type'       => 'AggregateRating',
                'ratingValue' => $product->avg_rating,
                'reviewCount' => $product->review_count,
            ] : null,
        ], fn ($v) => $v !== null && $v !== '');

        // Open Graph tags
        $og = [
            'og:type'        => 'product',
            'og:title'       => $product->seo_title ?: $product->name,
            'og:description' => $product->seo_description ?: $product->description_short,
            'og:url'         => $url,
            'og:site_name'   => $brandName,
            'og:locale'      => 'en_MY',
            'og:locale:alternate' => 'ms_MY',
            'og:image'       => $product->og_image_url ?: $img,
            'og:image:width' => 1200,
            'og:image:height'=> 630,
            'product:price:amount'   => $product->sale_price,
            'product:price:currency' => 'MYR',
            'product:availability'   => $product->stock > 0 ? 'in stock' : 'out of stock',
            'product:condition'      => $product->condition ?: 'new',
            'product:brand'          => $brandName,
            'product:retailer_item_id' => $product->sku,
        ];

        // Twitter Card
        $twitter = [
            'twitter:card'        => $product->twitter_card ?: 'summary_large_image',
            'twitter:title'       => $product->seo_title ?: $product->name,
            'twitter:description' => $product->seo_description ?: $product->description_short,
            'twitter:image'       => $product->og_image_url ?: $img,
        ];

        // Google Merchant Center feed row
        $merchant = array_filter([
            'id'                 => $product->sku,
            'title'              => $product->seo_title ?: $product->name,
            'description'        => $product->seo_description ?: $product->description_short,
            'link'               => $url,
            'image_link'         => $img,
            'additional_image_link' => count($images) > 1 ? array_slice($images, 1) : null,
            'availability'       => $product->stock > 0 ? 'in_stock' : 'out_of_stock',
            'condition'          => $product->condition ?: 'new',
            'price'              => $product->original_price > 0 && $product->original_price > $product->sale_price
                                       ? number_format($product->original_price, 2, '.', '') . ' MYR'
                                       : number_format($product->sale_price, 2, '.', '') . ' MYR',
            'sale_price'         => $product->original_price > 0 && $product->original_price > $product->sale_price
                                       ? number_format($product->sale_price, 2, '.', '') . ' MYR' : null,
            'sale_price_effective_date' => ($product->sale_starts_at && $product->sale_ends_at)
                                       ? $product->sale_starts_at->format('Y-m-d\\TH:i') . '/' . $product->sale_ends_at->format('Y-m-d\\TH:i')
                                       : null,
            'brand'              => $brandName,
            'gtin'               => $product->gtin,
            'mpn'                => $product->mpn,
            'identifier_exists'  => ($product->gtin || $product->mpn) ? 'TRUE' : 'FALSE',
            'google_product_category' => $product->google_product_category,
            'product_type'       => $product->category,
            'item_group_id'      => $hasVariants ? $product->sku : null,
            'shipping_weight'    => $product->weight_kg ? "{$product->weight_kg} kg" : null,
            'gender'             => $product->gender,
            'age_group'          => $product->age_group,
            'material'           => $product->material,
            'pattern'            => $product->pattern,
            'color'              => $product->color,
            'size_type'          => $product->size_type,
        ], fn ($v) => $v !== null && $v !== '');

        return $this->success([
            'product_id' => $product->id,
            'json_ld'    => $jsonLd,
            'json_ld_html' => '<script type="application/ld+json">' . json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . '</script>',
            'og_tags'    => $og,
            'twitter_card' => $twitter,
            'meta_html'  => $this->buildMetaHtml($product, $og, $twitter),
            'merchant_feed' => $merchant,
            'preview_url' => $url,
        ]);
    }

    private function buildMetaHtml(Product $product, array $og, array $twitter): string
    {
        $lines = [
            '<title>' . htmlspecialchars($product->seo_title ?: $product->name) . '</title>',
            '<meta name="description" content="' . htmlspecialchars((string) ($product->seo_description ?: $product->description_short)) . '">',
            '<meta name="robots" content="' . ($product->robots ?: 'index,follow') . '">',
            '<meta name="keywords" content="' . htmlspecialchars(implode(', ', array_filter([
                $product->focus_keyword,
                ...(($product->secondary_keywords ?? [])),
                ...(($product->tags ?? [])),
            ]))) . '">',
        ];
        if ($product->canonical_url) $lines[] = '<link rel="canonical" href="' . htmlspecialchars($product->canonical_url) . '">';
        foreach ($og as $k => $v) {
            if ($v !== null && $v !== '') $lines[] = '<meta property="' . $k . '" content="' . htmlspecialchars((string) $v) . '">';
        }
        foreach ($twitter as $k => $v) {
            if ($v !== null && $v !== '') $lines[] = '<meta name="' . $k . '" content="' . htmlspecialchars((string) $v) . '">';
        }
        return implode("\n", $lines);
    }

    /** Roll-up cost from active BOM (or specified BOM via ?bom_id). */
    public function cost(Product $product, Request $request): JsonResponse
    {
        $bom = $request->bom_id
            ? \App\Models\Inventory\BomHeader::with('lines.stockItem')->find($request->bom_id)
            : \App\Models\Inventory\BomHeader::with('lines.stockItem')
                ->where('product_id', $product->id)->where('is_active', true)->first();

        if (!$bom) {
            return $this->success([
                'product_id' => $product->id,
                'product'    => $product->only(['sku','name']),
                'bom'        => null,
                'breakdown'  => [],
                'totals'     => ['material' => 0, 'tailor_service' => 0, 'overhead' => 0, 'grand' => 0],
                'per_unit'   => 0,
            ]);
        }

        $breakdown = [];
        $totals = ['material' => 0.0, 'tailor_service' => 0.0, 'overhead' => 0.0];
        foreach ($bom->lines as $ln) {
            $unitCost = $ln->kind === 'material'
                ? (float) (optional($ln->stockItem)->unit_cost ?? 0)
                : (float) $ln->unit_cost;
            $lineCost = (float) $ln->qty * $unitCost;
            $totals[$ln->kind] = ($totals[$ln->kind] ?? 0) + $lineCost;
            $breakdown[] = [
                'kind'         => $ln->kind,
                'item'         => $ln->kind === 'material'
                                    ? optional($ln->stockItem)->name
                                    : $ln->service_name,
                'item_code'    => $ln->kind === 'material' ? optional($ln->stockItem)->item_code : null,
                'qty'          => (float) $ln->qty,
                'uom'          => $ln->uom,
                'unit_cost'    => $unitCost,
                'line_cost'    => round($lineCost, 2),
            ];
        }

        $grand   = array_sum($totals);
        $perUnit = $grand / max((float) $bom->output_qty, 0.001);

        return $this->success([
            'product_id' => $product->id,
            'product'    => $product->only(['sku','name','uom']),
            'bom'        => [
                'id'         => $bom->id,
                'bom_number' => $bom->bom_number,
                'version'    => $bom->version,
                'output_qty' => (float) $bom->output_qty,
                'output_uom' => $bom->output_uom,
            ],
            'breakdown'  => $breakdown,
            'totals'     => array_map(fn ($v) => round($v, 2), $totals + ['grand' => $grand]),
            'per_unit'   => round($perUnit, 2),
        ]);
    }
}
