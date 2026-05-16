<?php
namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesReportController extends Controller
{
    use ApiResponse;

    public function summary(Request $request): JsonResponse
    {
        return $this->error('Sales summary report will be wired in Phase 5', 501);
    }

    public function byCustomer(Request $request): JsonResponse
    {
        return $this->error('Sales-by-customer report will be wired in Phase 5', 501);
    }

    public function byProduct(Request $request): JsonResponse
    {
        return $this->error('Sales-by-product report will be wired in Phase 5', 501);
    }

    public function byAgent(Request $request): JsonResponse
    {
        return $this->error('Sales-by-agent report will be wired in Phase 5', 501);
    }

    public function returnsSummary(Request $request): JsonResponse
    {
        return $this->error('Returns-summary report will be wired in Phase 5', 501);
    }
}
