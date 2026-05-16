<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Sales\SaleInvoice;
use App\Services\Payments\PaymentGatewayFactory;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function createIntent(Request $request, int $orderId, string $driver)
    {
        $order = SaleInvoice::where('source', 'online')->findOrFail($orderId);
        $gateway = PaymentGatewayFactory::make($driver);
        return response()->json($gateway->createIntent($order));
    }

    public function webhook(Request $request, string $driver)
    {
        $gateway = PaymentGatewayFactory::make($driver);
        return response()->json($gateway->webhook($request));
    }

    /**
     * Public: fetch payment instructions for a recently-placed order, looked up
     * by si_number. Used by the order-confirmation page.
     */
    public function instructions(Request $request, string $soNumber)
    {
        $order = SaleInvoice::where('source', 'online')
            ->where('si_number', $soNumber)
            ->firstOrFail();

        // Anti-enumeration: only return instructions while still awaiting payment
        if (!in_array($order->storefront_status, ['pending_payment', null], true)) {
            return response()->json(['status' => $order->storefront_status]);
        }

        $gateway = PaymentGatewayFactory::make($order->payment_method ?? 'cod');
        $intent = $gateway->createIntent($order);
        return response()->json([
            'so_number'     => $order->si_number,
            'si_number'     => $order->si_number,
            'amount'        => $order->amount,
            'payment_method'=> $order->payment_method,
            'status'        => $order->storefront_status,
            'instructions'  => $intent['instructions'] ?? null,
            'driver'        => $intent['driver'] ?? null,
        ]);
    }
}
