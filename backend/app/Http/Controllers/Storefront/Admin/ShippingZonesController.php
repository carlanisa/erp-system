<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\ShippingZone;
use Illuminate\Http\Request;

class ShippingZonesController extends Controller
{
    public function index()
    {
        return response()->json(ShippingZone::with('rates')->orderBy('sort_order')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string',
            'code'        => 'required|string|max:8|unique:storefront_shipping_zones,code',
            'state_codes' => 'nullable|array',
            'enabled'     => 'nullable|boolean',
            'rates'       => 'nullable|array',
        ]);
        $zone = ShippingZone::create($data);
        foreach ($data['rates'] ?? [] as $r) {
            $zone->rates()->create($r);
        }
        return response()->json($zone->load('rates'));
    }

    public function update(Request $request, int $id)
    {
        $zone = ShippingZone::findOrFail($id);
        $data = $request->validate([
            'name'        => 'nullable|string',
            'state_codes' => 'nullable|array',
            'enabled'     => 'nullable|boolean',
        ]);
        $zone->update($data);

        if ($request->has('rates')) {
            $zone->rates()->delete();
            foreach ($request->input('rates', []) as $r) {
                $zone->rates()->create($r);
            }
        }
        return response()->json($zone->load('rates'));
    }
}
