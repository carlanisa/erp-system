<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Wishlist;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $items = Wishlist::with('product')
            ->where('customer_id', $request->user('customer')->id)
            ->orderByDesc('id')
            ->get();
        return response()->json($items);
    }

    public function add(Request $request)
    {
        $data = $request->validate(['product_id' => 'required|integer|exists:products,id']);
        $item = Wishlist::firstOrCreate([
            'customer_id' => $request->user('customer')->id,
            'product_id'  => $data['product_id'],
        ]);
        return response()->json($item->load('product'));
    }

    public function remove(Request $request, int $productId)
    {
        Wishlist::where('customer_id', $request->user('customer')->id)
            ->where('product_id', $productId)
            ->delete();
        return response()->json(['ok' => true]);
    }
}
