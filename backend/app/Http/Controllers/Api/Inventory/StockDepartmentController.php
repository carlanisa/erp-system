<?php
namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\StockDepartment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockDepartmentController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = StockDepartment::query()
            ->when($request->search, fn($q,$s) =>
                $q->where('name','ilike',"%$s%")->orWhere('code','ilike',"%$s%")
            )
            ->orderBy('code');
        return $this->success($q->get());
    }

    public function flat(): JsonResponse
    {
        return $this->success(StockDepartment::where('is_active', true)->orderBy('code')->get(['id','code','name']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'required|string|max:50|unique:stock_departments,code',
            'name'      => 'required|string|max:255',
            'manager'   => 'nullable|string|max:255',
            'notes'     => 'nullable|string',
            'is_active' => 'boolean',
        ]);
        return $this->success(StockDepartment::create($data), 'Department created');
    }

    public function show(StockDepartment $stockDepartment): JsonResponse
    {
        return $this->success($stockDepartment);
    }

    public function update(Request $request, StockDepartment $stockDepartment): JsonResponse
    {
        $data = $request->validate([
            'code'      => 'sometimes|string|max:50|unique:stock_departments,code,'.$stockDepartment->id,
            'name'      => 'sometimes|string|max:255',
            'manager'   => 'nullable|string|max:255',
            'notes'     => 'nullable|string',
            'is_active' => 'boolean',
        ]);
        $stockDepartment->update($data);
        return $this->success($stockDepartment->fresh(), 'Updated');
    }

    public function destroy(StockDepartment $stockDepartment): JsonResponse
    {
        $stockDepartment->delete();
        return $this->success(null, 'Deleted');
    }
}
