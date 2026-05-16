<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Sales\SalesOrder;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function orders(Request $request)
    {
        $customer = $request->user('customer');
        $orders = SalesOrder::where('source', 'storefront')
            ->where(function ($q) use ($customer) {
                $q->where('customer_id', $customer->id)
                  ->orWhere('customer_id_storefront', $customer->id);
            })
            ->orderByDesc('id')
            ->paginate(20);
        return response()->json($orders);
    }

    public function order(Request $request, int $id)
    {
        $customer = $request->user('customer');
        $order = SalesOrder::with('lines')
            ->where('source', 'storefront')
            ->where(function ($q) use ($customer) {
                $q->where('customer_id', $customer->id)
                  ->orWhere('customer_id_storefront', $customer->id);
            })
            ->findOrFail($id);
        return response()->json($order);
    }
}
