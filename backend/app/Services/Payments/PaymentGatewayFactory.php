<?php

namespace App\Services\Payments;

use App\Services\Payments\Drivers\BankTransferDriver;
use App\Services\Payments\Drivers\BillplzDriver;
use App\Services\Payments\Drivers\CodDriver;
use App\Services\Payments\Drivers\PayPalDriver;
use App\Services\Payments\Drivers\StripeDriver;
use App\Services\Payments\Drivers\ToyyibPayDriver;
use InvalidArgumentException;

class PaymentGatewayFactory
{
    public static function make(string $driver): PaymentGateway
    {
        return match ($driver) {
            'stripe'        => new StripeDriver(),
            'paypal'        => new PayPalDriver(),
            'billplz'       => new BillplzDriver(),
            'toyyibpay'     => new ToyyibPayDriver(),
            'bank_transfer' => new BankTransferDriver(),
            'cod'           => new CodDriver(),
            default         => throw new InvalidArgumentException("Unknown payment driver: $driver"),
        };
    }
}
