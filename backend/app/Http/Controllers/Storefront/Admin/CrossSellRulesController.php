<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\CrossSellRule;
use Illuminate\Http\Request;

class CrossSellRulesController extends Controller
{
    public function index()
    {
        return response()->json(CrossSellRule::orderBy('priority')->paginate(50));
    }

    public function store(Request $request)
    {
        $data = $this->payload($request, true);
        return response()->json(CrossSellRule::create($data), 201);
    }

    public function update(Request $request, int $id)
    {
        $rule = CrossSellRule::findOrFail($id);
        $rule->update($this->payload($request, false));
        return response()->json($rule);
    }

    public function destroy(int $id)
    {
        CrossSellRule::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function payload(Request $request, bool $creating): array
    {
        return $request->validate([
            'name'                => ($creating ? 'required' : 'nullable') . '|string|max:160',
            'anchor_type'         => ($creating ? 'required' : 'nullable') . '|in:product,category',
            'anchor_value'        => ($creating ? 'required' : 'nullable') . '|string|max:160',
            'suggest_categories'  => 'nullable|array',
            'suggest_product_ids' => 'nullable|array',
            'reason_text'         => 'nullable|string|max:255',
            'max_suggestions'     => 'nullable|integer|min:1|max:20',
            'priority'            => 'nullable|integer',
            'active'              => 'nullable|boolean',
        ]);
    }
}
