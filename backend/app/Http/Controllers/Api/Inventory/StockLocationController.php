<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\StockLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockLocationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = StockLocation::query()
            ->when($request->type, fn($q,$t) => $q->where('type', $t))
            ->when($request->search, fn($q,$s) =>
                $q->where('name','ilike',"%$s%")->orWhere('code','ilike',"%$s%")
            )
            ->orderBy('code');
        return $this->success($q->get());
    }

    public function flat(): JsonResponse
    {
        return $this->success(StockLocation::where('is_active', true)->orderBy('code')->get(['id','code','name','type']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'           => 'required|string|max:50|unique:stock_locations,code',
            'name'           => 'required|string|max:255',
            'type'           => 'in:warehouse,tailor,store,transit',
            'address'        => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:50',
            'is_active'      => 'boolean',
        ]);
        return $this->success(StockLocation::create($data), 'Location created');
    }

    public function show(StockLocation $stockLocation): JsonResponse
    {
        return $this->success($stockLocation);
    }

    public function update(Request $request, StockLocation $stockLocation): JsonResponse
    {
        $data = $request->validate([
            'code'           => 'sometimes|string|max:50|unique:stock_locations,code,'.$stockLocation->id,
            'name'           => 'sometimes|string|max:255',
            'type'           => 'sometimes|in:warehouse,tailor,store,transit',
            'address'        => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:50',
            'is_active'      => 'boolean',
        ]);
        $stockLocation->update($data);
        return $this->success($stockLocation->fresh(), 'Updated');
    }

    public function destroy(StockLocation $stockLocation): JsonResponse
    {
        $stockLocation->delete();
        return $this->success(null, 'Deleted');
    }
}
