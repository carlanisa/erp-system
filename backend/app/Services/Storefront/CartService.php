<?php

namespace App\Services\Storefront;

use App\Models\CRM\Customer;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use App\Models\Storefront\Cart;
use App\Models\Storefront\CartItem;
use Illuminate\Support\Str;

class CartService
{
    public function findOrCreate(?string $sessionToken, ?Customer $customer = null): Cart
    {
        if ($customer) {
            $cart = Cart::where('customer_id', $customer->id)->where('status', 'active')->first();
            if ($cart) return $cart;
        }
        if ($sessionToken) {
            $cart = Cart::where('session_token', $sessionToken)->where('status', 'active')->first();
            if ($cart) {
                if ($customer && !$cart->customer_id) {
                    $cart->update(['customer_id' => $customer->id]);
                }
                return $cart;
            }
        }
        return Cart::create([
            'customer_id'   => $customer?->id,
            'session_token' => $sessionToken ?: Str::random(48),
            'currency'      => 'MYR',
        ]);
    }

    public function addItem(Cart $cart, int $productId, ?int $variantId, float $qty = 1): CartItem
    {
        $product = Product::findOrFail($productId);
        $variant = $variantId ? ProductVariant::find($variantId) : null;

        $unitPrice = (float) ($variant?->sale_price ?? $variant?->price ?? $product->sale_price ?? 0);
        $color = $variant->color ?? $product->color;
        $size  = $variant->size ?? null;

        $existing = $cart->items()
            ->where('product_id', $productId)
            ->where('variant_id', $variantId)
            ->first();

        if ($existing) {
            $existing->qty = $existing->qty + $qty;
            $existing->line_total = round($existing->qty * $existing->unit_price, 2);
            $existing->save();
            $item = $existing;
        } else {
            $item = $cart->items()->create([
                'product_id' => $productId,
                'variant_id' => $variantId,
                'item_code'  => $variant->sku ?? $product->sku,
                'name'       => $product->name,
                'color'      => $color,
                'size'       => $size,
                'qty'        => $qty,
                'unit_price' => $unitPrice,
                'line_total' => round($qty * $unitPrice, 2),
            ]);
        }

        $this->recalculate($cart);
        return $item;
    }

    public function updateQty(Cart $cart, int $itemId, float $qty): void
    {
        $item = $cart->items()->where('id', $itemId)->firstOrFail();
        if ($qty <= 0) {
            $item->delete();
        } else {
            $item->update([
                'qty'        => $qty,
                'line_total' => round($qty * $item->unit_price, 2),
            ]);
        }
        $this->recalculate($cart);
    }

    public function removeItem(Cart $cart, int $itemId): void
    {
        $cart->items()->where('id', $itemId)->delete();
        $this->recalculate($cart);
    }

    public function recalculate(Cart $cart): Cart
    {
        $items = $cart->items()->get();
        $subtotal = $items->sum('line_total');
        $cart->subtotal = round($subtotal, 2);
        $cart->discount_total = 0; // coupons handled in Phase 2
        $cart->tax_total = 0;
        $cart->shipping_total = $cart->shipping_total ?: 0;
        $cart->grand_total = round($cart->subtotal - $cart->discount_total + $cart->shipping_total + $cart->tax_total, 2);
        $cart->save();
        return $cart;
    }

    public function mergeGuestIntoCustomer(string $guestToken, Customer $customer): Cart
    {
        $guest = Cart::where('session_token', $guestToken)->where('status', 'active')->first();
        $customerCart = Cart::where('customer_id', $customer->id)->where('status', 'active')->first();

        if (!$guest) {
            return $customerCart ?: $this->findOrCreate(null, $customer);
        }
        if (!$customerCart) {
            $guest->update(['customer_id' => $customer->id]);
            return $guest;
        }
        foreach ($guest->items as $gi) {
            $this->addItem($customerCart, $gi->product_id, $gi->variant_id, $gi->qty);
        }
        $guest->update(['status' => 'abandoned']);
        return $this->recalculate($customerCart);
    }
}
