<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Coupon;
use Illuminate\Http\Request;

class CouponsController extends Controller
{
    public function index()
    {
        return response()->json(Coupon::orderByDesc('id')->paginate(50));
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request, true);
        $data['code'] = strtoupper($data['code']);
        $coupon = Coupon::create($data);
        return response()->json($coupon, 201);
    }

    public function update(Request $request, int $id)
    {
        $coupon = Coupon::findOrFail($id);
        $data = $this->validatePayload($request, false);
        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $coupon->update($data);
        return response()->json($coupon);
    }

    public function destroy(int $id)
    {
        Coupon::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function validatePayload(Request $request, bool $creating): array
    {
        $rules = [
            'code'               => ($creating ? 'required' : 'nullable') . '|string|max:60|unique:storefront_coupons,code' . ($creating ? '' : ',' . $request->route('id')),
            'description'        => 'nullable|string|max:255',
            'type'               => ($creating ? 'required' : 'nullable') . '|in:percent,fixed,free_shipping',
            'value'              => 'nullable|numeric|min:0',
            'min_subtotal'       => 'nullable|numeric|min:0',
            'starts_at'          => 'nullable|date',
            'ends_at'            => 'nullable|date',
            'usage_limit'        => 'nullable|integer|min:1',
            'per_customer_limit' => 'nullable|integer|min:1',
            'applies_to'         => 'nullable|in:all,category,product',
            'target_ids'         => 'nullable|array',
            'stackable'          => 'nullable|boolean',
            'active'             => 'nullable|boolean',
        ];
        return $request->validate($rules);
    }
}
