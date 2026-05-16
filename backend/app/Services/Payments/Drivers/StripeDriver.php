<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StripeDriver implements PaymentGateway
{
    use MarksOrderPaid, ReadsDriverConfig;

    public function createIntent(SalesOrder $order): array
    {
        $secret = $this->cfg('stripe', 'secret', 'services.stripe.secret');
        if (!$secret) {
            return ['error' => 'Stripe is not configured.', 'driver' => 'stripe'];
        }

        $amountInCents = (int) round($order->amount * 100);

        $response = Http::asForm()
            ->withBasicAuth($secret, '')
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode'           => 'payment',
                'success_url'    => config('app.url') . '/order/confirmation?so=' . $order->so_number,
                'cancel_url'     => config('app.url') . '/checkout',
                'client_reference_id' => (string) $order->id,
                'line_items[0][price_data][currency]'          => 'myr',
                'line_items[0][price_data][unit_amount]'       => $amountInCents,
                'line_items[0][price_data][product_data][name]'=> 'Order ' . $order->so_number,
                'line_items[0][quantity]'                      => 1,
                'metadata[order_id]'                           => (string) $order->id,
            ]);

        if (!$response->successful()) {
            Log::warning('Stripe createIntent failed', ['body' => $response->body()]);
            return ['error' => 'Stripe error.', 'driver' => 'stripe'];
        }

        $session = $response->json();
        PaymentTransaction::create([
            'order_id'        => $order->id,
            'driver'          => 'stripe',
            'intent_id'       => $session['id'] ?? null,
            'status'          => 'pending',
            'amount'          => $order->amount,
            'request_payload' => ['session' => $session['id'] ?? null],
            'response_payload'=> $session,
        ]);

        return [
            'driver'      => 'stripe',
            'redirect_url'=> $session['url'] ?? null,
            'intent_id'   => $session['id'] ?? null,
        ];
    }

    public function webhook(Request $request): array
    {
        $payload = $request->json()->all();
        $event = $payload['type'] ?? null;

        if ($event !== 'checkout.session.completed') {
            return ['ok' => true, 'ignored' => $event];
        }

        $session = $payload['data']['object'] ?? [];
        $orderId = $session['metadata']['order_id'] ?? $session['client_reference_id'] ?? null;
        if (!$orderId) return ['ok' => false, 'reason' => 'no order_id'];

        $order = SalesOrder::find($orderId);
        if (!$order) return ['ok' => false, 'reason' => 'order not found'];

        $amount = ($session['amount_total'] ?? 0) / 100;
        $this->markPaid($order, 'stripe', (string)($session['id'] ?? ''), (float)$amount, $session);
        return ['ok' => true];
    }
}
