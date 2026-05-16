<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Sales\SalesOrder;
use App\Services\Payments\PaymentGatewayFactory;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function createIntent(Request $request, int $orderId, string $driver)
    {
        $order = SalesOrder::where('source', 'storefront')->findOrFail($orderId);
        $gateway = PaymentGatewayFactory::make($driver);
        return response()->json($gateway->createIntent($order));
    }

    public function webhook(Request $request, string $driver)
    {
        $gateway = PaymentGatewayFactory::make($driver);
        return response()->json($gateway->webhook($request));
    }
}
