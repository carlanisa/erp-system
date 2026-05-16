<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;

class CodDriver implements PaymentGateway
{
    use MarksOrderPaid;

    public function createIntent(SalesOrder $order): array
    {
        PaymentTransaction::firstOrCreate(
            ['order_id' => $order->id, 'driver' => 'cod'],
            ['status' => 'pending', 'amount' => $order->amount],
        );
        return [
            'driver' => 'cod',
            'instructions' => [
                'notice' => 'You will pay cash when your order is delivered. Our team will contact you to confirm shortly.',
            ],
        ];
    }

    public function webhook(Request $request): array
    {
        return ['ok' => true, 'ignored' => 'cod has no webhook'];
    }
}
