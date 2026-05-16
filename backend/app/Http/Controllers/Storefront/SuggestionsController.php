<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Inventory\Product;
use App\Services\Storefront\BehaviorTracker;
use App\Services\Storefront\CartService;
use App\Services\Storefront\CrossSellEngine;
use App\Services\Storefront\VoucherForge;
use Illuminate\Http\Request;

class SuggestionsController extends Controller
{
    public function __construct(
        private CrossSellEngine $crossSell,
        private CartService $cartService,
        private VoucherForge $forge,
        private BehaviorTracker $tracker,
    ) {}

    /** Suggestions for the current cart + a near-threshold nudge. */
    public function forCart(Request $request)
    {
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $groups = $this->crossSell->suggestForCart($cart, 8);

        $delta = $this->tracker->amountToFreeShipping($cart);
        return response()->json([
            'groups' => $groups,
            'free_shipping_delta' => $delta,
            'cart' => [
                'subtotal'   => $cart->subtotal,
                'item_count' => $cart->items->sum('qty'),
            ],
        ]);
    }

    public function forProduct(int $productId)
    {
        $product = Product::findOrFail($productId);
        return response()->json([
            'groups' => $this->crossSell->suggestForProduct($product, 6),
        ]);
    }

    /** Log a behavior signal AND maybe forge an offer. */
    public function signal(Request $request)
    {
        $data = $request->validate([
            'event'         => 'required|string|max:40',
            'payload'       => 'nullable|array',
        ]);
        $sessionToken = $request->header('X-Cart-Token') ?: $request->input('session_token');
        if (!$sessionToken) {
            return response()->json(['ok' => false, 'reason' => 'no session_token'], 422);
        }

        $cart = $this->cartService->findOrCreate($sessionToken, $request->user('customer'));
        $this->tracker->log($sessionToken, $data['event'], $data['payload'] ?? [], $cart->id, $request->user('customer')?->id);

        $intervention = $this->tracker->decideIntervention($sessionToken, $data['event'], $cart, $request->user('customer')?->id);

        return response()->json([
            'ok' => true,
            'mood' => $intervention['mood'],
            'voucher' => $intervention['voucher'],
            'message' => $intervention['message'],
        ]);
    }

    /** Returns any live (non-expired, unused) vouchers for this session. */
    public function liveVouchers(Request $request)
    {
        $token = $request->header('X-Cart-Token') ?: $request->query('session_token');
        if (!$token) return response()->json([]);

        $vouchers = $this->forge->liveForSession($token);
        return response()->json(array_map(fn($v) => $this->tracker->presentVoucher($v), $vouchers));
    }
}
