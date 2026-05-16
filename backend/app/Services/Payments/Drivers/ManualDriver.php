<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentMethod;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;

/**
 * Generic manual payment method.
 * Admin defines arbitrary instructions + (optional) contact_phone for WhatsApp +
 * contact_email. The customer sees a notice + a "Send receipt on WhatsApp" button.
 *
 * The PaymentMethod row's `code` distinguishes one manual method from another
 * (e.g. ewallet_tng, qr_payment, custom_xyz). All such rows have driver='manual'.
 */
class ManualDriver implements PaymentGateway
{
    use MarksOrderPaid;

    public function __construct(private ?string $methodCode = null) {}

    public function createIntent(SalesOrder $order): array
    {
        $method = $this->resolveMethod($order);
        $config = $method?->config ?? [];

        PaymentTransaction::firstOrCreate(
            ['order_id' => $order->id, 'driver' => 'manual'],
            ['status' => 'pending', 'amount' => $order->amount, 'request_payload' => ['method_code' => $method?->code]],
        );

        $phone = (string) ($config['contact_phone'] ?? '');
        $waMsg = "Hi, here is my payment receipt for order *{$order->so_number}* (RM " . number_format($order->amount, 2) . ").";
        $whatsappLink = $phone
            ? 'https://wa.me/' . preg_replace('/[^0-9]/', '', $phone) . '?text=' . rawurlencode($waMsg)
            : null;

        return [
            'driver'  => 'manual',
            'method'  => $method?->code,
            'instructions' => [
                'title'         => $method?->label ?? 'Manual payment',
                'reference'     => $order->so_number,
                'amount'        => $order->amount,
                'account_name'  => $config['account_name']  ?? null,
                'account_number'=> $config['account_number'] ?? null,
                'contact_email' => $config['contact_email'] ?? null,
                'contact_phone' => $phone ?: null,
                'whatsapp_url'  => $whatsappLink,
                'qr_image_url'  => $config['qr_image_url']  ?? null,
                'notice'        => $config['notice'] ?? 'After payment, share your receipt with our team to confirm your order.',
                'fields'        => $config['fields'] ?? [], // [{label,value}] for arbitrary key-value display
            ],
        ];
    }

    public function webhook(Request $request): array
    {
        return ['ok' => true, 'ignored' => 'manual confirmation only'];
    }

    private function resolveMethod(SalesOrder $order): ?PaymentMethod
    {
        $code = $this->methodCode ?? $order->payment_method;
        if (!$code) return null;
        return PaymentMethod::where('code', $code)->first()
            ?? PaymentMethod::where('driver', 'manual')->where('enabled', true)->orderBy('sort_order')->first();
    }
}
