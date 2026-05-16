<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\ProductType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductTypeController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = ProductType::query()
            ->when($request->active !== 'false', fn ($q) => $q->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('label');

        return $this->success($q->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $type = ProductType::create($data);

        return $this->success($type, 'Product type created');
    }

    public function update(Request $request, ProductType $productType): JsonResponse
    {
        $data = $this->validatePayload($request, true);
        // System types: only label / emoji / description / sort_order can change. Key + is_system locked.
        if ($productType->is_system) {
            unset($data['key'], $data['is_system'], $data['is_active']);
        }
        $productType->update($data);

        return $this->success($productType->fresh(), 'Product type updated');
    }

    public function destroy(ProductType $productType): JsonResponse
    {
        if ($productType->is_system) {
            return $this->error('System types cannot be deleted', 422);
        }
        $productType->update(['is_active' => false]);

        return $this->success(['ok' => true], 'Product type deactivated');
    }

    private function validatePayload(Request $request, bool $update = false): array
    {
        return $request->validate([
            'key'         => 'nullable|string|max:60',
            'label'       => ($update ? 'sometimes|' : '') . 'required|string|max:120',
            'emoji'       => 'nullable|string|max:8',
            'description' => 'nullable|string|max:255',
            'sort_order'  => 'nullable|integer',
            'is_active'   => 'nullable|boolean',
        ]);
    }
}
