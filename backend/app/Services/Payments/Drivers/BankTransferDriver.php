<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;

class BankTransferDriver implements PaymentGateway
{
    use MarksOrderPaid;

    public function createIntent(SalesOrder $order): array
    {
        PaymentTransaction::firstOrCreate(
            ['order_id' => $order->id, 'driver' => 'bank_transfer'],
            ['status' => 'pending', 'amount' => $order->amount],
        );
        return [
            'driver' => 'bank_transfer',
            'instructions' => [
                'bank' => config('services.bank_transfer.bank_name', 'Maybank'),
                'account_name' => config('services.bank_transfer.account_name', 'Modestwear Sdn Bhd'),
                'account_number' => config('services.bank_transfer.account_number', '5141-2345-6789'),
                'reference' => $order->so_number,
                'amount' => $order->amount,
                'notice' => 'After transfer, send your proof of payment via WhatsApp to confirm. Order will ship once payment is verified.',
            ],
        ];
    }

    public function webhook(Request $request): array
    {
        // Manual confirmation in ERP — no automated webhook.
        return ['ok' => true, 'ignored' => 'manual confirmation'];
    }
}
