<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Services\Storefront\CartService;
use App\Services\Storefront\CouponService;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private CouponService $couponService,
    ) {}

    public function apply(Request $request)
    {
        $data = $request->validate(['code' => 'required|string|max:60']);
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $result = $this->couponService->apply($cart, $data['code']);
        return response()->json([
            'ok'       => $result['ok'],
            'message'  => $result['message'],
            'discount' => $result['discount'],
            'cart'     => $cart->fresh('items'),
        ], $result['ok'] ? 200 : 422);
    }

    public function remove(Request $request)
    {
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $this->couponService->remove($cart);
        return response()->json(['ok' => true, 'cart' => $cart->fresh('items')]);
    }
}
