<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory\ProductCollection;
use Illuminate\Http\Request;

class ProductCollectionController extends Controller
{
    public function index()
    {
        $cols = ProductCollection::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['success' => true, 'data' => $cols]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:200',
            'slug'        => 'nullable|string|max:220|unique:product_collections,slug',
            'description' => 'nullable|string',
            'sort_order'  => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
        ]);

        $col = ProductCollection::create($data + ['is_active' => $data['is_active'] ?? true]);
        return response()->json(['success' => true, 'data' => $col], 201);
    }

    public function show(ProductCollection $productCollection)
    {
        return response()->json(['success' => true, 'data' => $productCollection->load('products:id,name,sku,category,is_active')]);
    }

    public function update(Request $request, ProductCollection $productCollection)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:200',
            'slug'        => 'nullable|string|max:220|unique:product_collections,slug,' . $productCollection->id,
            'description' => 'nullable|string',
            'sort_order'  => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
        ]);

        $productCollection->update($data);
        return response()->json(['success' => true, 'data' => $productCollection]);
    }

    public function destroy(ProductCollection $productCollection)
    {
        // Detach products (nullify collection_id) — done automatically via nullOnDelete FK
        $productCollection->delete();
        return response()->json(['success' => true]);
    }

    /** Flat list for dropdowns */
    public function flat()
    {
        $cols = ProductCollection::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);
        return response()->json(['success' => true, 'data' => $cols]);
    }
}
