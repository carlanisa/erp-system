<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodsController extends Controller
{
    public function index()
    {
        // Auto-seed defaults if empty
        if (PaymentMethod::count() === 0) {
            $defaults = [
                ['code' => 'cod',           'driver' => 'cod',           'label' => 'Cash on Delivery (COD)',         'sort_order' => 1, 'enabled' => true],
                ['code' => 'bank_transfer', 'driver' => 'bank_transfer', 'label' => 'Manual Bank Transfer',           'sort_order' => 2, 'enabled' => true],
                ['code' => 'stripe',        'driver' => 'stripe',        'label' => 'Credit/Debit Card (Stripe)',     'sort_order' => 3, 'enabled' => false],
                ['code' => 'paypal',        'driver' => 'paypal',        'label' => 'PayPal',                          'sort_order' => 4, 'enabled' => false],
                ['code' => 'billplz',       'driver' => 'billplz',       'label' => 'Billplz (FPX / Online Banking)', 'sort_order' => 5, 'enabled' => false],
                ['code' => 'toyyibpay',     'driver' => 'toyyibpay',     'label' => 'ToyyibPay',                       'sort_order' => 6, 'enabled' => false],
            ];
            foreach ($defaults as $d) PaymentMethod::create($d);
        }
        return response()->json(PaymentMethod::orderBy('sort_order')->get());
    }

    public function update(Request $request, int $id)
    {
        $method = PaymentMethod::findOrFail($id);
        $data = $request->validate([
            'label'   => 'nullable|string',
            'enabled' => 'nullable|boolean',
            'config'  => 'nullable|array',
            'sort_order' => 'nullable|integer',
        ]);
        $method->update($data);
        return response()->json($method);
    }
}
