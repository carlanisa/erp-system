<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Storefront\CustomerAddress;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            CustomerAddress::where('customer_id', $request->user('customer')->id)
                ->orderByDesc('is_default_shipping')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $this->payload($request);
        $data['customer_id'] = $request->user('customer')->id;
        if ($data['is_default_shipping'] ?? false) {
            CustomerAddress::where('customer_id', $data['customer_id'])->update(['is_default_shipping' => false]);
        }
        $addr = CustomerAddress::create($data);
        return response()->json($addr, 201);
    }

    public function update(Request $request, int $id)
    {
        $addr = CustomerAddress::where('customer_id', $request->user('customer')->id)->findOrFail($id);
        $data = $this->payload($request);
        if ($data['is_default_shipping'] ?? false) {
            CustomerAddress::where('customer_id', $addr->customer_id)->update(['is_default_shipping' => false]);
        }
        $addr->update($data);
        return response()->json($addr);
    }

    public function destroy(Request $request, int $id)
    {
        CustomerAddress::where('customer_id', $request->user('customer')->id)
            ->where('id', $id)->delete();
        return response()->json(['ok' => true]);
    }

    private function payload(Request $request): array
    {
        return $request->validate([
            'label'      => 'nullable|string|max:60',
            'name'       => 'required|string|max:120',
            'phone'      => 'required|string|max:30',
            'line1'      => 'required|string|max:160',
            'line2'      => 'nullable|string|max:160',
            'city'       => 'required|string|max:80',
            'state_code' => 'required|string|max:8',
            'postcode'   => 'required|string|max:10',
            'country'    => 'nullable|string|max:2',
            'is_default_shipping' => 'nullable|boolean',
            'is_default_billing'  => 'nullable|boolean',
        ]);
    }
}
