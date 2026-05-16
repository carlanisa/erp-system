<?php

namespace App\Services\Payments;

use App\Models\Sales\SalesOrder;
use Illuminate\Http\Request;

interface PaymentGateway
{
    /** Return data the frontend needs to redirect or render a widget. */
    public function createIntent(SalesOrder $order): array;

    /** Handle the gateway's webhook. Should mark order paid + record PaymentTransaction. */
    public function webhook(Request $request): array;
}
