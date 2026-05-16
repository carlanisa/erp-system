<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\BomHeader;
use App\Models\Inventory\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BomController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = BomHeader::with(['product','lines.stockItem','createdBy'])
            ->when($request->product_id, fn($q,$p) => $q->where('product_id', $p))
            ->when($request->search, fn($q,$s) =>
                $q->whereHas('product', fn($p) => $p->where('name','ilike',"%$s%")->orWhere('sku','ilike',"%$s%"))
            )
            ->orderByDesc('id');
        return $this->success($q->get());
    }

    public function show(BomHeader $bom): JsonResponse
    {
        return $this->success($bom->load(['product','lines.stockItem','createdBy']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id'  => 'required|exists:products,id',
            'version'     => 'nullable|integer|min:1',
            'is_active'   => 'boolean',
            'output_qty'  => 'nullable|numeric|min:0.001',
            'output_uom'  => 'nullable|string|max:20',
            'notes'       => 'nullable|string',
            'lines'       => 'array',
            'lines.*.kind'          => 'in:material,tailor_service,overhead',
            'lines.*.stock_item_id' => 'nullable|exists:stock_items,id',
            'lines.*.account_id'    => 'nullable|exists:accounts,id',
            'lines.*.item_code'     => 'nullable|string|max:100',
            'lines.*.description'   => 'nullable|string',
            'lines.*.service_name'  => 'nullable|string|max:255',
            'lines.*.color'         => 'nullable|string|max:80',
            'lines.*.size'          => 'nullable|string|max:80',
            'lines.*.roll_count'    => 'nullable|numeric',
            'lines.*.qty'           => 'required|numeric|min:0.001',
            'lines.*.uom'           => 'nullable|string|max:20',
            'lines.*.unit_cost'     => 'nullable|numeric|min:0',
            'lines.*.discount'      => 'nullable|numeric|min:0',
            'lines.*.notes'         => 'nullable|string',
        ]);

        $bom = DB::transaction(function () use ($data, $request) {
            $version = $data['version'] ?? ((BomHeader::where('product_id', $data['product_id'])->max('version') ?? 0) + 1);
            $header = BomHeader::create([
                'bom_number'  => $this->nextNumber(),
                'product_id'  => $data['product_id'],
                'version'     => $version,
                'is_active'   => $data['is_active'] ?? true,
                'output_qty'  => $data['output_qty'] ?? 1,
                'output_uom'  => $data['output_uom'] ?? 'PCS',
                'notes'       => $data['notes'] ?? null,
                'created_by'  => $request->user()->id,
            ]);

            foreach ($data['lines'] ?? [] as $i => $ln) {
                $header->lines()->create([
                    'kind'          => $ln['kind'] ?? 'material',
                    'stock_item_id' => $ln['stock_item_id'] ?? null,
                    'account_id'    => $ln['account_id'] ?? null,
                    'item_code'     => $ln['item_code'] ?? null,
                    'description'   => $ln['description'] ?? null,
                    'service_name'  => $ln['service_name'] ?? null,
                    'color'         => $ln['color'] ?? null,
                    'size'          => $ln['size'] ?? null,
                    'roll_count'    => $ln['roll_count'] ?? null,
                    'qty'           => $ln['qty'],
                    'uom'           => $ln['uom'] ?? null,
                    'unit_cost'     => $ln['unit_cost'] ?? 0,
                    'discount'      => $ln['discount'] ?? 0,
                    'notes'         => $ln['notes'] ?? null,
                    'sort_order'    => $i,
                ]);
            }

            // If marked active, point product->default_bom_id and deactivate sibling BOMs
            if ($header->is_active) {
                BomHeader::where('product_id', $header->product_id)->where('id', '!=', $header->id)->update(['is_active' => false]);
                Product::where('id', $header->product_id)->update(['default_bom_id' => $header->id]);
            }

            return $header;
        });

        return $this->success($bom->load(['product','lines.stockItem']), 'BOM created');
    }

    public function update(Request $request, BomHeader $bom): JsonResponse
    {
        $data = $request->validate([
            'version'    => 'sometimes|integer|min:1',
            'is_active'  => 'boolean',
            'output_qty' => 'nullable|numeric|min:0.001',
            'output_uom' => 'nullable|string|max:20',
            'notes'      => 'nullable|string',
            'lines'      => 'array',
            'lines.*.kind'          => 'in:material,tailor_service,overhead',
            'lines.*.stock_item_id' => 'nullable|exists:stock_items,id',
            'lines.*.account_id'    => 'nullable|exists:accounts,id',
            'lines.*.item_code'     => 'nullable|string|max:100',
            'lines.*.description'   => 'nullable|string',
            'lines.*.service_name'  => 'nullable|string|max:255',
            'lines.*.color'         => 'nullable|string|max:80',
            'lines.*.size'          => 'nullable|string|max:80',
            'lines.*.roll_count'    => 'nullable|numeric',
            'lines.*.qty'           => 'required|numeric|min:0.001',
            'lines.*.uom'           => 'nullable|string|max:20',
            'lines.*.unit_cost'     => 'nullable|numeric|min:0',
            'lines.*.discount'      => 'nullable|numeric|min:0',
            'lines.*.notes'         => 'nullable|string',
        ]);

        DB::transaction(function () use ($data, $bom) {
            $bom->update(collect($data)->except('lines')->toArray());

            if (array_key_exists('lines', $data)) {
                $bom->lines()->delete();
                foreach ($data['lines'] as $i => $ln) {
                    $bom->lines()->create([
                        'kind'          => $ln['kind'] ?? 'material',
                        'stock_item_id' => $ln['stock_item_id'] ?? null,
                        'account_id'    => $ln['account_id'] ?? null,
                        'item_code'     => $ln['item_code'] ?? null,
                        'description'   => $ln['description'] ?? null,
                        'service_name'  => $ln['service_name'] ?? null,
                        'color'         => $ln['color'] ?? null,
                        'size'          => $ln['size'] ?? null,
                        'roll_count'    => $ln['roll_count'] ?? null,
                        'qty'           => $ln['qty'],
                        'uom'           => $ln['uom'] ?? null,
                        'unit_cost'     => $ln['unit_cost'] ?? 0,
                        'discount'      => $ln['discount'] ?? 0,
                        'notes'         => $ln['notes'] ?? null,
                        'sort_order'    => $i,
                    ]);
                }
            }

            if ($bom->is_active) {
                BomHeader::where('product_id', $bom->product_id)->where('id', '!=', $bom->id)->update(['is_active' => false]);
                Product::where('id', $bom->product_id)->update(['default_bom_id' => $bom->id]);
            }
        });

        return $this->success($bom->fresh(['product','lines.stockItem']), 'Updated');
    }

    public function destroy(BomHeader $bom): JsonResponse
    {
        $bom->delete();
        return $this->success(null, 'Deleted');
    }

    private function nextNumber(): string
    {
        $next = (BomHeader::max('id') ?? 0) + 1;
        $num  = 'BOM-' . str_pad($next, 5, '0', STR_PAD_LEFT);
        while (BomHeader::where('bom_number', $num)->exists()) { $next++; $num = 'BOM-' . str_pad($next, 5, '0', STR_PAD_LEFT); }
        return $num;
    }
}
