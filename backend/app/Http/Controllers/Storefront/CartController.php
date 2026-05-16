<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Services\Storefront\CartService;
use App\Services\Storefront\ShippingCalculator;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private ShippingCalculator $shipping,
    ) {}

    public function show(Request $request)
    {
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token') ?: $request->query('session_token'),
            $request->user('customer'),
        );
        return response()->json($this->present($cart));
    }

    public function addItem(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'qty'        => 'nullable|numeric|min:1',
        ]);

        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token') ?: $request->input('session_token'),
            $request->user('customer'),
        );
        $this->cartService->addItem($cart, $data['product_id'], $data['variant_id'] ?? null, $data['qty'] ?? 1);

        return response()->json($this->present($cart->fresh('items')));
    }

    public function updateItem(Request $request, int $id)
    {
        $data = $request->validate(['qty' => 'required|numeric|min:0']);
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $this->cartService->updateQty($cart, $id, $data['qty']);
        return response()->json($this->present($cart->fresh('items')));
    }

    public function removeItem(Request $request, int $id)
    {
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $this->cartService->removeItem($cart, $id);
        return response()->json($this->present($cart->fresh('items')));
    }

    public function shippingQuote(Request $request)
    {
        $data = $request->validate([
            'state_code' => 'nullable|string',
            'country'    => 'nullable|string|size:2',
        ]);
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $quote = $this->shipping->quote($data, $cart);
        return response()->json($quote);
    }

    private function present($cart): array
    {
        return [
            'id'             => $cart->id,
            'session_token'  => $cart->session_token,
            'currency'       => $cart->currency,
            'subtotal'       => $cart->subtotal,
            'discount_total' => $cart->discount_total,
            'shipping_total' => $cart->shipping_total,
            'tax_total'      => $cart->tax_total,
            'grand_total'    => $cart->grand_total,
            'coupon_code'    => $cart->coupon_code,
            'items'          => $cart->items->map(fn($i) => [
                'id'         => $i->id,
                'product_id' => $i->product_id,
                'variant_id' => $i->variant_id,
                'name'       => $i->name,
                'color'      => $i->color,
                'size'       => $i->size,
                'qty'        => $i->qty,
                'unit_price' => $i->unit_price,
                'line_total' => $i->line_total,
            ])->values(),
        ];
    }
}
