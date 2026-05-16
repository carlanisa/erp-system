<?php

namespace App\Services\Payments\Drivers;

use App\Models\Sales\SalesOrder;
use App\Models\Storefront\PaymentTransaction;
use App\Services\Payments\PaymentGateway;
use Illuminate\Http\Request;

class BankTransferDriver implements PaymentGateway
{
    use MarksOrderPaid, ReadsDriverConfig;

    public function createIntent(SalesOrder $order): array
    {
        PaymentTransaction::firstOrCreate(
            ['order_id' => $order->id, 'driver' => 'bank_transfer'],
            ['status' => 'pending', 'amount' => $order->amount],
        );

        return [
            'driver' => 'bank_transfer',
            'instructions' => $this->buildInstructions($order),
        ];
    }

    public function webhook(Request $request): array
    {
        return ['ok' => true, 'ignored' => 'manual confirmation'];
    }

    public function buildInstructions(SalesOrder $order): array
    {
        $phone  = (string) $this->cfg('bank_transfer', 'contact_phone', 'services.bank_transfer.contact_phone', '');
        $email  = (string) $this->cfg('bank_transfer', 'contact_email', 'services.bank_transfer.contact_email', '');
        $waMsg  = "Hi, here is my payment receipt for order *{$order->so_number}* (RM " . number_format($order->amount, 2) . ").";
        $whatsappLink = $phone
            ? 'https://wa.me/' . preg_replace('/[^0-9]/', '', $phone) . '?text=' . rawurlencode($waMsg)
            : null;

        return [
            'bank'           => $this->cfg('bank_transfer', 'bank_name', 'services.bank_transfer.bank_name', 'Maybank'),
            'account_name'   => $this->cfg('bank_transfer', 'account_name', 'services.bank_transfer.account_name', 'Modestwear Sdn Bhd'),
            'account_number' => $this->cfg('bank_transfer', 'account_number', 'services.bank_transfer.account_number', '—'),
            'reference'      => $order->so_number,
            'amount'         => $order->amount,
            'contact_email'  => $email ?: null,
            'contact_phone'  => $phone ?: null,
            'whatsapp_url'   => $whatsappLink,
            'notice'         => $this->cfg('bank_transfer', 'notice', null,
                'After transfer, send the payment receipt'
                . ($phone ? ' via WhatsApp to ' . $phone : '')
                . ($email ? ' or email ' . $email : '')
                . '. Your order will ship once payment is verified.'),
        ];
    }
}
