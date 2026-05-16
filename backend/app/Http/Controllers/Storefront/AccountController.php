<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Sales\SaleInvoice;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function orders(Request $request)
    {
        $customer = $request->user('customer');
        $orders = SaleInvoice::where('source', 'online')
            ->where('customer_id', $customer->id)
            ->orderByDesc('id')
            ->paginate(20);
        return response()->json($orders);
    }

    public function order(Request $request, int $id)
    {
        $customer = $request->user('customer');
        $order = SaleInvoice::with('lines')
            ->where('source', 'online')
            ->where('customer_id', $customer->id)
            ->findOrFail($id);
        return response()->json($order);
    }
}
