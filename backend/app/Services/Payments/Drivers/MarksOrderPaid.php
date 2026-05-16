<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;

trait MarksOrderPaid
{
    protected function markPaid(SalesOrder $order, string $driver, string $intentId, float $amount, array $rawResponse = []): PaymentTransaction
    {
        $tx = PaymentTransaction::updateOrCreate(
            ['order_id' => $order->id, 'driver' => $driver, 'intent_id' => $intentId],
            [
                'status'          => 'paid',
                'amount'          => $amount,
                'currency'        => 'MYR',
                'response_payload'=> $rawResponse,
                'paid_at'         => now(),
            ],
        );
        $order->update([
            'storefront_status' => 'paid',
            'payment_reference' => $intentId,
            'payment_method'    => $driver,
        ]);
        return $tx;
    }
}
