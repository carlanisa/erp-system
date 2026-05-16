<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Bundle;
use App\Services\Storefront\BundleService;
use App\Services\Storefront\CartService;
use Illuminate\Http\Request;

class BundleController extends Controller
{
    public function __construct(
        private BundleService $bundleService,
        private CartService $cartService,
    ) {}

    public function index()
    {
        $bundles = Bundle::where('active', true)->with('items.product')->orderBy('sort_order')->get();
        return response()->json($bundles->map(fn($b) => $this->bundleService->presentBundle($b)));
    }

    public function show(string $slug)
    {
        $bundle = Bundle::where('active', true)->where('slug', $slug)
            ->with('items.product')->firstOrFail();
        return response()->json($this->bundleService->presentBundle($bundle));
    }

    public function forProduct(int $productId)
    {
        $bundles = $this->bundleService->bundlesForProduct($productId);
        return response()->json($bundles->map(fn($b) => $this->bundleService->presentBundle($b)));
    }

    public function addToCart(Request $request, int $id)
    {
        $bundle = Bundle::with('items')->findOrFail($id);
        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );
        $picked = $request->input('items'); // optional [product_id => qty]
        $cart = $this->bundleService->addBundleToCart($bundle, $cart, $picked ?? []);
        return response()->json([
            'ok' => true,
            'message' => 'Bundle added to cart',
            'cart' => $cart->fresh('items'),
        ]);
    }
}
