<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Sales\SalesOrder;
use Illuminate\Http\Request;

class StorefrontOrdersController extends Controller
{
    public function index(Request $request)
    {
        $q = SalesOrder::with('customer')->where('source', 'storefront');
        if ($status = $request->query('status')) {
            $q->where('storefront_status', $status);
        }
        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    public function show(int $id)
    {
        $order = SalesOrder::with(['lines', 'customer'])
            ->where('source', 'storefront')
            ->findOrFail($id);
        return response()->json($order);
    }
}
