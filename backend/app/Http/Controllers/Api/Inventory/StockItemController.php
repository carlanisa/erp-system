<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\StockItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockItemController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = StockItem::with('department')
            ->when($request->type, fn($q,$t) => $q->where('type', $t))
            ->when($request->department_id, fn($q,$d) => $q->where('department_id', $d))
            ->when($request->search, fn($q,$s) =>
                $q->where('name','ilike',"%$s%")
                  ->orWhere('item_code','ilike',"%$s%")
                  ->orWhere('color','ilike',"%$s%")
            )
            ->orderBy('item_code');
        return $this->success($q->get());
    }

    public function flat(): JsonResponse
    {
        return $this->success(
            StockItem::where('is_active', true)
                ->orderBy('item_code')
                ->get(['id','item_code','name','type','uom','color','size','current_stock','unit_cost'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_code'      => 'nullable|string|max:50|unique:stock_items,item_code',
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'type'           => 'in:fabric,accessory,raw_material,consumable',
            'department_id'  => 'nullable|exists:stock_departments,id',
            'uom'            => 'nullable|string|max:20',
            'color'          => 'nullable|string|max:80',
            'size'           => 'nullable|string|max:80',
            'current_stock'  => 'nullable|numeric',
            'reorder_level'  => 'nullable|numeric',
            'unit_cost'      => 'nullable|numeric',
            'costing_method' => 'in:fifo,lifo,average',
            'is_active'      => 'boolean',
        ]);
        $data['item_code'] = $data['item_code'] ?? $this->nextCode($data['type'] ?? 'fabric');

        return $this->success(StockItem::create($data)->load('department'), 'Stock item created');
    }

    public function show(StockItem $stockItem): JsonResponse
    {
        return $this->success($stockItem->load('department'));
    }

    public function update(Request $request, StockItem $stockItem): JsonResponse
    {
        $data = $request->validate([
            'item_code'      => 'sometimes|string|max:50|unique:stock_items,item_code,'.$stockItem->id,
            'name'           => 'sometimes|string|max:255',
            'description'    => 'nullable|string',
            'type'           => 'in:fabric,accessory,raw_material,consumable',
            'department_id'  => 'nullable|exists:stock_departments,id',
            'uom'            => 'nullable|string|max:20',
            'color'          => 'nullable|string|max:80',
            'size'           => 'nullable|string|max:80',
            'current_stock'  => 'nullable|numeric',
            'reorder_level'  => 'nullable|numeric',
            'unit_cost'      => 'nullable|numeric',
            'costing_method' => 'in:fifo,lifo,average',
            'is_active'      => 'boolean',
        ]);
        $stockItem->update($data);
        return $this->success($stockItem->fresh('department'), 'Updated');
    }

    public function destroy(StockItem $stockItem): JsonResponse
    {
        $stockItem->delete();
        return $this->success(null, 'Deleted');
    }

    private function nextCode(string $type): string
    {
        $prefix = match ($type) {
            'fabric'       => 'FAB-',
            'accessory'    => 'ACC-',
            'raw_material' => 'RAW-',
            'consumable'   => 'CON-',
            default        => 'ITM-',
        };
        $next = (StockItem::where('item_code','like',"$prefix%")->count()) + 1;
        $code = $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
        while (StockItem::where('item_code', $code)->exists()) {
            $next++; $code = $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
        }
        return $code;
    }
}
