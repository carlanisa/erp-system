<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ToyyibPayDriver implements PaymentGateway
{
    use MarksOrderPaid, ReadsDriverConfig;

    private function base(): string
    {
        return $this->cfg('toyyibpay', 'sandbox', 'services.toyyibpay.sandbox', true)
            ? 'https://dev.toyyibpay.com'
            : 'https://toyyibpay.com';
    }

    public function createIntent(SalesOrder $order): array
    {
        $secret = $this->cfg('toyyibpay', 'secret', 'services.toyyibpay.secret');
        $category = $this->cfg('toyyibpay', 'category', 'services.toyyibpay.category');
        if (!$secret || !$category) return ['error' => 'ToyyibPay not configured.', 'driver' => 'toyyibpay'];

        $shipping = $order->shipping_address_json ?? [];

        $r = Http::asForm()->post($this->base() . '/index.php/api/createBill', [
            'userSecretKey'     => $secret,
            'categoryCode'      => $category,
            'billName'          => 'Order ' . $order->so_number,
            'billDescription'   => 'Storefront order ' . $order->so_number,
            'billPriceSetting'  => 1,
            'billPayorInfo'     => 1,
            'billAmount'        => (int) round($order->amount * 100),
            'billReturnUrl'     => config('app.url') . '/order/confirmation?so=' . $order->so_number,
            'billCallbackUrl'   => config('app.url') . '/api/storefront/webhooks/toyyibpay',
            'billExternalReferenceNo' => (string) $order->id,
            'billTo'            => $shipping['name'] ?? 'Customer',
            'billEmail'         => $shipping['email'] ?? 'noreply@example.com',
            'billPhone'         => $shipping['phone'] ?? '0000000000',
        ]);

        if (!$r->successful()) {
            Log::warning('ToyyibPay createIntent failed', ['body' => $r->body()]);
            return ['error' => 'ToyyibPay error.', 'driver' => 'toyyibpay'];
        }
        $billCode = $r->json('0.BillCode');
        if (!$billCode) return ['error' => 'ToyyibPay error.', 'driver' => 'toyyibpay', 'raw' => $r->json()];

        PaymentTransaction::create([
            'order_id'  => $order->id, 'driver' => 'toyyibpay',
            'intent_id' => $billCode, 'status' => 'pending',
            'amount'    => $order->amount, 'response_payload' => $r->json(),
        ]);

        return [
            'driver' => 'toyyibpay',
            'redirect_url' => $this->base() . '/' . $billCode,
            'intent_id' => $billCode,
        ];
    }

    public function webhook(Request $request): array
    {
        $billCode = $request->input('billcode');
        $status = $request->input('status_id'); // 1 = success
        $orderId = $request->input('order_id');
        if (!$billCode || $status !== '1') return ['ok' => true, 'ignored' => true];

        $order = SalesOrder::find($orderId);
        if (!$order) return ['ok' => false, 'reason' => 'order not found'];
        $amount = ((int) $request->input('amount', 0)) / 100;
        $this->markPaid($order, 'toyyibpay', $billCode, $amount, $request->all());
        return ['ok' => true];
    }
}
