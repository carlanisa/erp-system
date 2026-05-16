<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\ShippingZone;
use Illuminate\Http\Request;

class ShippingZonesController extends Controller
{
    public function index()
    {
        $zones = ShippingZone::with('rates')->orderBy('sort_order')->get();
        // Expose courier name (but not config secrets) by appending it back manually
        return response()->json($zones->map(function ($z) {
            $arr = $z->toArray();
            $arr['has_courier_config'] = !empty($z->courier_config);
            return $arr;
        }));
    }

    public function show(int $id)
    {
        // Includes courier_config — only for admin editing
        $zone = ShippingZone::with('rates')->findOrFail($id);
        $arr = $zone->toArray();
        $arr['courier_config'] = $zone->courier_config;
        return response()->json($arr);
    }

    public function store(Request $request)
    {
        $data = $this->payload($request, true);
        $rates = $data['rates'] ?? [];
        unset($data['rates']);

        $zone = ShippingZone::create($data);
        foreach ($rates as $r) {
            $zone->rates()->create($this->cleanRate($r));
        }
        return response()->json($zone->load('rates'), 201);
    }

    public function update(Request $request, int $id)
    {
        $zone = ShippingZone::findOrFail($id);
        $data = $this->payload($request, false);
        $rates = $data['rates'] ?? null;
        unset($data['rates']);

        $zone->update($data);

        if ($rates !== null) {
            $zone->rates()->delete();
            foreach ($rates as $r) {
                $zone->rates()->create($this->cleanRate($r));
            }
        }
        return response()->json($zone->load('rates'));
    }

    public function destroy(int $id)
    {
        ShippingZone::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function payload(Request $request, bool $creating): array
    {
        return $request->validate([
            'name'           => ($creating ? 'required' : 'nullable') . '|string|max:120',
            'code'           => ($creating ? 'required' : 'nullable') . '|string|max:8' . ($creating ? '|unique:storefront_shipping_zones,code' : ''),
            'country_code'   => 'nullable|string|size:2',
            'state_codes'    => 'nullable|array',
            'courier'        => 'nullable|string|max:30',
            'courier_config' => 'nullable|array',
            'enabled'        => 'nullable|boolean',
            'sort_order'     => 'nullable|integer',
            'rates'          => 'nullable|array',
            'rates.*.name'       => 'required|string|max:120',
            'rates.*.flat_rate'  => 'required|numeric|min:0',
            'rates.*.free_over'  => 'nullable|numeric|min:0',
            'rates.*.weight_min' => 'nullable|numeric|min:0',
            'rates.*.weight_max' => 'nullable|numeric|min:0',
            'rates.*.enabled'    => 'nullable|boolean',
            'rates.*.sort_order' => 'nullable|integer',
        ]);
    }

    private function cleanRate(array $r): array
    {
        return [
            'name'       => $r['name'],
            'flat_rate'  => (float) $r['flat_rate'],
            'free_over'  => isset($r['free_over']) && $r['free_over'] !== '' ? (float) $r['free_over'] : null,
            'weight_min' => isset($r['weight_min']) && $r['weight_min'] !== '' ? (float) $r['weight_min'] : null,
            'weight_max' => isset($r['weight_max']) && $r['weight_max'] !== '' ? (float) $r['weight_max'] : null,
            'enabled'    => $r['enabled'] ?? true,
            'sort_order' => $r['sort_order'] ?? 0,
        ];
    }
}
