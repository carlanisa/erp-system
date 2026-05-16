<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductCategoryController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = ProductCategory::query()
            ->when($request->search, fn ($q, $s) =>
                $q->where('name', 'ilike', "%$s%")->orWhere('slug', 'ilike', "%$s%"))
            ->when($request->active !== 'false', fn ($q) => $q->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('name');

        return $this->success($q->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $cat  = ProductCategory::create($data);

        return $this->success($cat, 'Category created');
    }

    public function update(Request $request, ProductCategory $productCategory): JsonResponse
    {
        $data = $this->validatePayload($request, true);
        $productCategory->update($data);

        return $this->success($productCategory->fresh(), 'Category updated');
    }

    public function destroy(ProductCategory $productCategory): JsonResponse
    {
        // Soft remove via is_active so historical products keep their tag.
        $productCategory->update(['is_active' => false]);

        return $this->success(['ok' => true], 'Category deactivated');
    }

    private function validatePayload(Request $request, bool $update = false): array
    {
        return $request->validate([
            'name'        => ($update ? 'sometimes|' : '') . 'required|string|max:120',
            'slug'        => 'nullable|string|max:140',
            'parent_id'   => 'nullable|exists:product_categories,id',
            'sort_order'  => 'nullable|integer',
            'is_active'   => 'nullable|boolean',
            'description' => 'nullable|string|max:255',
        ]);
    }
}
