<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BillplzDriver implements PaymentGateway
{
    use MarksOrderPaid, ReadsDriverConfig;

    private function base(): string
    {
        return $this->cfg('billplz', 'sandbox', 'services.billplz.sandbox', true)
            ? 'https://www.billplz-sandbox.com/api/v3'
            : 'https://www.billplz.com/api/v3';
    }

    public function createIntent(SalesOrder $order): array
    {
        $apiKey = $this->cfg('billplz', 'key', 'services.billplz.key');
        $collectionId = $this->cfg('billplz', 'collection_id', 'services.billplz.collection_id');
        if (!$apiKey || !$collectionId) return ['error' => 'Billplz not configured.', 'driver' => 'billplz'];

        $shipping = $order->shipping_address_json ?? [];

        $r = Http::withBasicAuth($apiKey, '')
            ->asForm()
            ->post($this->base() . '/bills', [
                'collection_id' => $collectionId,
                'description'   => 'Order ' . $order->so_number,
                'email'         => $shipping['email'] ?? 'noreply@example.com',
                'name'          => $shipping['name'] ?? 'Customer',
                'amount'        => (int) round($order->amount * 100),
                'callback_url'  => config('app.url') . '/api/storefront/webhooks/billplz',
                'redirect_url'  => config('app.url') . '/order/confirmation?so=' . $order->so_number,
                'reference_1_label' => 'Order ID',
                'reference_1'   => (string) $order->id,
            ]);

        if (!$r->successful()) {
            Log::warning('Billplz createIntent failed', ['body' => $r->body()]);
            return ['error' => 'Billplz error.', 'driver' => 'billplz'];
        }
        $data = $r->json();
        PaymentTransaction::create([
            'order_id'  => $order->id, 'driver' => 'billplz',
            'intent_id' => $data['id'] ?? null, 'status' => 'pending',
            'amount'    => $order->amount,
            'response_payload' => $data,
        ]);
        return [
            'driver' => 'billplz',
            'redirect_url' => $data['url'] ?? null,
            'intent_id' => $data['id'] ?? null,
        ];
    }

    public function webhook(Request $request): array
    {
        $billId = $request->input('id');
        $paid = $request->input('paid') === 'true' || $request->input('paid') === true;
        $orderId = $request->input('reference_1');
        if (!$billId || !$orderId || !$paid) return ['ok' => true, 'ignored' => true];

        $order = SalesOrder::find($orderId);
        if (!$order) return ['ok' => false, 'reason' => 'order not found'];
        $amount = ((int) $request->input('paid_amount', 0)) / 100;
        $this->markPaid($order, 'billplz', $billId, $amount, $request->all());
        return ['ok' => true];
    }
}
