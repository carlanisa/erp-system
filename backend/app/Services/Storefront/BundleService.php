<?php

namespace App\Services\Storefront;

use App\Models\Inventory\Product;
use App\Models\Storefront\Bundle;
use App\Models\Storefront\Cart;

class BundleService
{
    public function __construct(private CartService $cartService) {}

    /**
     * Compute bundle price using its pricing strategy.
     * Returns [original, final, savings].
     */
    public function priceBundle(Bundle $bundle, array $productIdsQty = []): array
    {
        // productIdsQty: [product_id => qty]; defaults to bundle.items default_qty
        if (empty($productIdsQty)) {
            $productIdsQty = $bundle->items->mapWithKeys(fn($i) => [$i->product_id => $i->default_qty])->all();
        }

        $prices = Product::whereIn('id', array_keys($productIdsQty))->get()
            ->mapWithKeys(fn($p) => [$p->id => (float) ($p->sale_price ?: $p->original_price ?: 0)])
            ->all();

        $original = 0.0;
        $lines = [];
        foreach ($productIdsQty as $pid => $qty) {
            $unit = $prices[$pid] ?? 0;
            $lineTotal = $unit * $qty;
            $original += $lineTotal;
            $lines[] = ['product_id' => $pid, 'qty' => $qty, 'unit_price' => $unit, 'line_total' => $lineTotal];
        }

        $final = match ($bundle->pricing_type) {
            'sum_minus_percent' => round($original * (1 - ($bundle->discount_value / 100)), 2),
            'fixed_total'       => round((float) $bundle->discount_value, 2),
            'free_cheapest'     => round($original - min($prices ?: [0]), 2),
            default             => $original,
        };
        $savings = max(0, round($original - $final, 2));

        return compact('original', 'final', 'savings', 'lines');
    }

    /** Add every item of a bundle to the cart at proportional discounted unit_price. */
    public function addBundleToCart(Bundle $bundle, Cart $cart, array $productIdsQty = []): Cart
    {
        $quote = $this->priceBundle($bundle, $productIdsQty);
        $original = $quote['original'] ?: 1;

        foreach ($quote['lines'] as $line) {
            // Per-line discounted unit price so bundle total = $quote['final']
            $share = $quote['final'] * ($line['line_total'] / $original);
            $discountedUnit = $line['qty'] > 0 ? round($share / $line['qty'], 2) : 0;

            $product = Product::find($line['product_id']);
            if (!$product) continue;

            $item = $cart->items()->create([
                'product_id' => $product->id,
                'variant_id' => null,
                'item_code'  => $product->sku,
                'name'       => $product->name,
                'color'      => $product->color,
                'qty'        => $line['qty'],
                'unit_price' => $discountedUnit,
                'line_total' => round($discountedUnit * $line['qty'], 2),
                'options_json'=> ['bundle_id' => $bundle->id, 'bundle_name' => $bundle->name],
            ]);
        }

        return $this->cartService->recalculate($cart);
    }

    /** Bundles tagged web + active that include a given product id. */
    public function bundlesForProduct(int $productId): \Illuminate\Support\Collection
    {
        return Bundle::where('active', true)
            ->whereHas('items', fn($q) => $q->where('product_id', $productId))
            ->with(['items.product'])
            ->orderBy('sort_order')->get();
    }

    public function presentBundle(Bundle $bundle): array
    {
        $quote = $this->priceBundle($bundle);
        return [
            'id'           => $bundle->id,
            'name'         => $bundle->name,
            'slug'         => $bundle->slug,
            'description'  => $bundle->description,
            'image_url'    => $bundle->image_url,
            'pricing_type' => $bundle->pricing_type,
            'discount_value' => $bundle->discount_value,
            'original'     => $quote['original'],
            'final'        => $quote['final'],
            'savings'      => $quote['savings'],
            'savings_percent' => $quote['original'] > 0 ? round(($quote['savings'] / $quote['original']) * 100) : 0,
            'items' => $bundle->items->map(fn($i) => [
                'product_id' => $i->product_id,
                'name'       => $i->product->name ?? '',
                'image'      => $i->product->featured_image_url ?? ($i->product->gallery_urls[0] ?? null),
                'price'      => $i->product->sale_price ?? 0,
                'qty'        => $i->default_qty,
                'role'       => $i->role,
            ])->values(),
        ];
    }
}
