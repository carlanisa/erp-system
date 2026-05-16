<?php

namespace App\Services\Payments;

use App\Models\Storefront\PaymentMethod;
use App\Services\Payments\Drivers\BankTransferDriver;
use App\Services\Payments\Drivers\BillplzDriver;
use App\Services\Payments\Drivers\CodDriver;
use App\Services\Payments\Drivers\ManualDriver;
use App\Services\Payments\Drivers\PayPalDriver;
use App\Services\Payments\Drivers\StripeDriver;
use App\Services\Payments\Drivers\ToyyibPayDriver;
use InvalidArgumentException;

class PaymentGatewayFactory
{
    /**
     * Make a gateway from either a built-in driver name or a custom PaymentMethod code.
     * If the code matches a row in storefront_payment_methods with driver='manual',
     * the ManualDriver is returned bound to that code.
     */
    public static function make(string $codeOrDriver): PaymentGateway
    {
        // Built-in drivers
        $built = match ($codeOrDriver) {
            'stripe'        => new StripeDriver(),
            'paypal'        => new PayPalDriver(),
            'billplz'       => new BillplzDriver(),
            'toyyibpay'     => new ToyyibPayDriver(),
            'bank_transfer' => new BankTransferDriver(),
            'cod'           => new CodDriver(),
            'manual'        => new ManualDriver(),
            default         => null,
        };
        if ($built) return $built;

        // Custom manual method (looked up by code)
        $method = PaymentMethod::where('code', $codeOrDriver)->first();
        if ($method) {
            if ($method->driver === 'manual') return new ManualDriver($method->code);
            return self::make($method->driver);
        }

        throw new InvalidArgumentException("Unknown payment method: $codeOrDriver");
    }
}
