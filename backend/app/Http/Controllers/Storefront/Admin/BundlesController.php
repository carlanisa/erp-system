<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Bundle;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BundlesController extends Controller
{
    public function index()
    {
        return response()->json(Bundle::with('items.product')->orderBy('sort_order')->paginate(30));
    }

    public function show(int $id)
    {
        return response()->json(Bundle::with('items.product')->findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $this->payload($request, true);
        $items = $data['items'] ?? [];
        unset($data['items']);
        $data['slug'] = Str::slug($data['slug'] ?? $data['name']);

        $bundle = Bundle::create($data);
        foreach ($items as $i => $item) {
            $bundle->items()->create([
                'product_id'  => $item['product_id'],
                'variant_id'  => $item['variant_id'] ?? null,
                'role'        => $item['role'] ?? 'required',
                'default_qty' => $item['default_qty'] ?? 1,
                'sort_order'  => $i,
            ]);
        }
        return response()->json($bundle->load('items.product'), 201);
    }

    public function update(Request $request, int $id)
    {
        $bundle = Bundle::findOrFail($id);
        $data = $this->payload($request, false);
        $items = $data['items'] ?? null;
        unset($data['items']);
        if (isset($data['slug'])) $data['slug'] = Str::slug($data['slug']);

        $bundle->update($data);
        if ($items !== null) {
            $bundle->items()->delete();
            foreach ($items as $i => $item) {
                $bundle->items()->create([
                    'product_id'  => $item['product_id'],
                    'variant_id'  => $item['variant_id'] ?? null,
                    'role'        => $item['role'] ?? 'required',
                    'default_qty' => $item['default_qty'] ?? 1,
                    'sort_order'  => $i,
                ]);
            }
        }
        return response()->json($bundle->load('items.product'));
    }

    public function destroy(int $id)
    {
        Bundle::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function payload(Request $request, bool $creating): array
    {
        return $request->validate([
            'name'          => ($creating ? 'required' : 'nullable') . '|string|max:160',
            'slug'          => 'nullable|string|max:160',
            'description'   => 'nullable|string',
            'image_url'     => 'nullable|string|max:500',
            'pricing_type'  => ($creating ? 'required' : 'nullable') . '|in:sum_minus_percent,fixed_total,free_cheapest',
            'discount_value'=> 'nullable|numeric|min:0',
            'min_items'     => 'nullable|integer|min:1',
            'active'        => 'nullable|boolean',
            'sort_order'    => 'nullable|integer',
            'channels'      => 'nullable|array',
            'items'         => 'nullable|array',
            'items.*.product_id'  => 'required_with:items|integer|exists:products,id',
            'items.*.variant_id'  => 'nullable|integer',
            'items.*.role'        => 'nullable|in:anchor,required,suggested',
            'items.*.default_qty' => 'nullable|integer|min:1',
        ]);
    }
}
