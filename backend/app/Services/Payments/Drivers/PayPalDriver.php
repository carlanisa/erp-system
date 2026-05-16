<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayPalDriver implements PaymentGateway
{
    use MarksOrderPaid, ReadsDriverConfig;

    private function base(): string
    {
        return $this->cfg('paypal', 'mode', 'services.paypal.mode', 'sandbox') === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    private function token(): ?string
    {
        $id = $this->cfg('paypal', 'client_id', 'services.paypal.client_id');
        $secret = $this->cfg('paypal', 'client_secret', 'services.paypal.client_secret');
        if (!$id || !$secret) return null;
        $r = Http::asForm()->withBasicAuth($id, $secret)
            ->post($this->base() . '/v1/oauth2/token', ['grant_type' => 'client_credentials']);
        return $r->json('access_token');
    }

    public function createIntent(SalesOrder $order): array
    {
        $token = $this->token();
        if (!$token) return ['error' => 'PayPal not configured.', 'driver' => 'paypal'];

        $r = Http::withToken($token)
            ->post($this->base() . '/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => (string) $order->id,
                    'amount' => ['currency_code' => 'MYR', 'value' => number_format($order->amount, 2, '.', '')],
                ]],
                'application_context' => [
                    'return_url' => config('app.url') . '/order/confirmation?so=' . $order->so_number,
                    'cancel_url' => config('app.url') . '/checkout',
                ],
            ]);

        if (!$r->successful()) {
            Log::warning('PayPal createIntent failed', ['body' => $r->body()]);
            return ['error' => 'PayPal error.', 'driver' => 'paypal'];
        }
        $data = $r->json();
        $approve = collect($data['links'] ?? [])->firstWhere('rel', 'approve');

        PaymentTransaction::create([
            'order_id'  => $order->id, 'driver' => 'paypal',
            'intent_id' => $data['id'] ?? null, 'status' => 'pending',
            'amount'    => $order->amount,
            'response_payload' => $data,
        ]);

        return [
            'driver' => 'paypal',
            'redirect_url' => $approve['href'] ?? null,
            'intent_id' => $data['id'] ?? null,
        ];
    }

    public function webhook(Request $request): array
    {
        $payload = $request->json()->all();
        if (($payload['event_type'] ?? null) !== 'CHECKOUT.ORDER.APPROVED'
            && ($payload['event_type'] ?? null) !== 'PAYMENT.CAPTURE.COMPLETED') {
            return ['ok' => true, 'ignored' => $payload['event_type'] ?? null];
        }

        $resource = $payload['resource'] ?? [];
        $orderId = $resource['purchase_units'][0]['reference_id'] ?? null;
        $intentId = $resource['id'] ?? null;
        if (!$orderId) return ['ok' => false, 'reason' => 'no reference_id'];

        $order = SalesOrder::find($orderId);
        if (!$order) return ['ok' => false, 'reason' => 'order not found'];

        $amount = (float)($resource['purchase_units'][0]['amount']['value'] ?? $order->amount);
        $this->markPaid($order, 'paypal', (string) $intentId, $amount, $resource);
        return ['ok' => true];
    }
}
