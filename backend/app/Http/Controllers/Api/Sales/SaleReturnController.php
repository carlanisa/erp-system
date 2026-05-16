<?php
namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Sales\SaleReturn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleReturnController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = SaleReturn::with(['customer','saleInvoice','account','bankAccount','lines.account','payments.account'])
            ->when($request->search, fn($q,$s) =>
                $q->where('sr_number','ilike',"%$s%")
                  ->orWhere('reference','ilike',"%$s%")
                  ->orWhereHas('customer', fn($q2) => $q2->where('name','ilike',"%$s%"))
            )
            ->when($request->customer_id,     fn($q,$s) => $q->where('customer_id', $s))
            ->when($request->sale_invoice_id, fn($q,$s) => $q->where('sale_invoice_id', $s))
            ->when($request->status,          fn($q,$s) => $q->where('status', $s))
            ->when($request->branch_code,     fn($q,$s) => $q->where('branch_code', $s))
            ->orderByDesc('date')->orderByDesc('id');

        return $this->paginated($q->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        return $this->error('Sale Return creation will be wired in Phase 2', 501);
    }

    public function show(SaleReturn $saleReturn): JsonResponse
    {
        return $this->success($saleReturn->load([
            'customer','saleInvoice','account','bankAccount',
            'lines.account','payments.account','createdBy',
        ]));
    }

    public function update(Request $request, SaleReturn $saleReturn): JsonResponse
    {
        return $this->error('Sale Return update will be wired in Phase 2', 501);
    }

    public function destroy(SaleReturn $saleReturn): JsonResponse
    {
        return $this->error('Sale Return delete will be wired in Phase 2', 501);
    }

    public function cancel(SaleReturn $saleReturn): JsonResponse
    {
        return $this->error('Cancel will be wired in Phase 2', 501);
    }
}
