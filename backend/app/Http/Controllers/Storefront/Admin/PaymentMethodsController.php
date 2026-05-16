<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodsController extends Controller
{
    public function index()
    {
        if (PaymentMethod::count() === 0) {
            $defaults = [
                ['code' => 'cod',           'driver' => 'cod',           'label' => 'Cash on Delivery (COD)',         'sort_order' => 1, 'enabled' => true,  'config' => []],
                ['code' => 'bank_transfer', 'driver' => 'bank_transfer', 'label' => 'Manual Bank Transfer',           'sort_order' => 2, 'enabled' => true,  'config' => []],
                ['code' => 'stripe',        'driver' => 'stripe',        'label' => 'Credit/Debit Card (Stripe)',     'sort_order' => 3, 'enabled' => false, 'config' => []],
                ['code' => 'paypal',        'driver' => 'paypal',        'label' => 'PayPal',                         'sort_order' => 4, 'enabled' => false, 'config' => []],
                ['code' => 'billplz',       'driver' => 'billplz',       'label' => 'Billplz (FPX / Online Banking)', 'sort_order' => 5, 'enabled' => false, 'config' => []],
                ['code' => 'toyyibpay',     'driver' => 'toyyibpay',     'label' => 'ToyyibPay',                      'sort_order' => 6, 'enabled' => false, 'config' => []],
            ];
            foreach ($defaults as $d) PaymentMethod::create($d);
        }
        return response()->json(PaymentMethod::orderBy('sort_order')->get());
    }

    public function show(int $id)
    {
        return response()->json(PaymentMethod::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'   => 'required|string|max:30|unique:storefront_payment_methods,code',
            'driver' => 'required|in:cod,bank_transfer,stripe,paypal,billplz,toyyibpay,manual',
            'label'  => 'required|string|max:120',
            'enabled'=> 'nullable|boolean',
            'config' => 'nullable|array',
            'sort_order' => 'nullable|integer',
            'min_amount' => 'nullable|numeric',
            'max_amount' => 'nullable|numeric',
        ]);
        $data['code'] = strtolower(preg_replace('/[^a-z0-9_]/i', '_', $data['code']));
        $method = PaymentMethod::create($data);
        return response()->json($method, 201);
    }

    public function update(Request $request, int $id)
    {
        $method = PaymentMethod::findOrFail($id);
        $data = $request->validate([
            'label'   => 'nullable|string|max:120',
            'enabled' => 'nullable|boolean',
            'config'  => 'nullable|array',
            'sort_order' => 'nullable|integer',
            'min_amount' => 'nullable|numeric',
            'max_amount' => 'nullable|numeric',
        ]);

        // Merge config: preserve existing values when admin only edits some keys
        if (isset($data['config'])) {
            $existing = $method->config ?? [];
            // Skip overwriting a secret key if the admin left it blank in the form (masking pattern)
            $secretKeys = ['secret', 'client_secret', 'key', 'x_signature'];
            foreach ($secretKeys as $k) {
                if (array_key_exists($k, $data['config']) && $data['config'][$k] === '' && !empty($existing[$k])) {
                    unset($data['config'][$k]);
                }
            }
            $data['config'] = array_merge($existing, $data['config']);
        }

        $method->update($data);
        return response()->json($method);
    }

    public function destroy(int $id)
    {
        $method = PaymentMethod::findOrFail($id);
        // Don't delete built-in methods; just disable
        if (in_array($method->driver, ['cod', 'bank_transfer', 'stripe', 'paypal', 'billplz', 'toyyibpay'])) {
            $method->update(['enabled' => false]);
            return response()->json(['ok' => true, 'note' => 'Built-in method disabled (not deleted).']);
        }
        $method->delete();
        return response()->json(['ok' => true]);
    }
}
