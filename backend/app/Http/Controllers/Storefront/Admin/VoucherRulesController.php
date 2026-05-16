<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\VoucherOffer;
use App\Models\Storefront\VoucherRule;
use Illuminate\Http\Request;

class VoucherRulesController extends Controller
{
    public function index()
    {
        return response()->json(VoucherRule::orderBy('priority')->get());
    }

    public function store(Request $request)
    {
        $data = $this->payload($request, true);
        return response()->json(VoucherRule::create($data), 201);
    }

    public function update(Request $request, int $id)
    {
        $rule = VoucherRule::findOrFail($id);
        $rule->update($this->payload($request, false));
        return response()->json($rule);
    }

    public function destroy(int $id)
    {
        VoucherRule::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function issuedOffers()
    {
        return response()->json(
            VoucherOffer::orderByDesc('id')->limit(200)->get()
        );
    }

    private function payload(Request $request, bool $creating): array
    {
        return $request->validate([
            'name'         => ($creating ? 'required' : 'nullable') . '|string|max:160',
            'trigger'      => ($creating ? 'required' : 'nullable') . '|in:threshold_near,idle_in_cart,exit_intent,add_to_cart_first,ai_concierge',
            'voucher_type' => ($creating ? 'required' : 'nullable') . '|in:free_shipping,percent,fixed',
            'value'        => 'nullable|numeric|min:0',
            'min_subtotal' => 'nullable|numeric|min:0',
            'valid_minutes'=> 'nullable|integer|min:1',
            'max_per_session' => 'nullable|integer|min:1',
            'idle_seconds' => 'nullable|integer|min:1',
            'threshold_min'=> 'nullable|numeric|min:0',
            'headline'     => 'nullable|string|max:160',
            'subtext'      => 'nullable|string|max:255',
            'active'       => 'nullable|boolean',
            'priority'     => 'nullable|integer',
        ]);
    }
}
