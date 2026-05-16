<?php
namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Sales\SaleInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Daily Sales Aggregator (a.k.a. "Sales Orders").
 *
 * Repurposed: instead of being a separate "pre-invoice quote" workflow,
 * this page is the single pane of glass for all incoming sales — from
 * every physical branch (via POS), the ERP-side Sale Invoice screen, and
 * future online channels (Shopee, TikTok, Website…). Data is sourced from
 * `sale_invoices` and grouped/filtered for daily review.
 */
class SalesOrderController extends Controller
{
    use ApiResponse;

    /**
     * Unified order list. Each row is a SaleInvoice — POS, ERP, or online —
     * with filters appropriate for daily sales review.
     */
    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolveRange($request);

        $q = SaleInvoice::with(['customer','createdBy'])
            ->where('is_cancelled', false)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->when($request->source,      fn($q,$s) => $q->where('source', $s))
            ->when($request->branch_code, fn($q,$s) => $q->where('branch_code', $s))
            ->when($request->customer_id, fn($q,$s) => $q->where('customer_id', $s))
            ->when($request->search,      fn($q,$s) =>
                $q->where(fn($q2) => $q2
                    ->where('si_number','ilike',"%$s%")
                    ->orWhere('reference','ilike',"%$s%")
                    ->orWhere('walk_in_name','ilike',"%$s%")
                    ->orWhereHas('customer', fn($q3) => $q3->where('name','ilike',"%$s%")))
            )
            ->orderByDesc('date')->orderByDesc('id');

        $paginated = $q->paginate($request->integer('per_page', 25));
        $resp      = $this->paginated($paginated);

        // Inject range echo + grand total of the filtered slice
        $body = json_decode($resp->getContent(), true);
        $body['meta']['from']        = $from->toDateString();
        $body['meta']['to']          = $to->toDateString();
        $body['meta']['grand_total'] = (float) (clone $q)->sum('amount');
        $body['meta']['order_count'] = (int)  (clone $q)->count();

        return response()->json($body);
    }

    /**
     * Daily aggregator stats: totals + breakdown by source and branch.
     * Drives the dashboard tiles on the page.
     */
    public function dashboard(Request $request): JsonResponse
    {
        [$from, $to] = $this->resolveRange($request);

        $base = SaleInvoice::where('is_cancelled', false)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to);

        $totalOrders = (clone $base)->count();
        $totalSales  = (float) (clone $base)->sum('amount');
        $totalPaid   = (float) (clone $base)->sum('paid_amount');

        $bySource = (clone $base)
            ->selectRaw('source, count(*) as count, sum(amount) as total')
            ->groupBy('source')
            ->get()
            ->map(fn($r) => [
                'source' => $r->source,
                'count'  => (int) $r->count,
                'total'  => (float) $r->total,
            ])
            ->values();

        $byBranch = (clone $base)
            ->selectRaw('branch_code, count(*) as count, sum(amount) as total')
            ->groupBy('branch_code')
            ->orderBy('branch_code')
            ->get()
            ->map(fn($r) => [
                'branch_code' => $r->branch_code,
                'count'       => (int) $r->count,
                'total'       => (float) $r->total,
            ])
            ->values();

        // Per-day breakdown for a sparkline / mini-chart later
        $byDay = (clone $base)
            ->selectRaw("date::date as day, count(*) as count, sum(amount) as total")
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn($r) => [
                'day'   => (string) $r->day,
                'count' => (int) $r->count,
                'total' => (float) $r->total,
            ])
            ->values();

        return $this->success([
            'from'         => $from->toDateString(),
            'to'           => $to->toDateString(),
            'total_orders' => $totalOrders,
            'total_sales'  => $totalSales,
            'total_paid'   => $totalPaid,
            'outstanding'  => max(0, $totalSales - $totalPaid),
            'by_source'    => $bySource,
            'by_branch'    => $byBranch,
            'by_day'       => $byDay,
        ]);
    }

    public function show($id): JsonResponse
    {
        $invoice = SaleInvoice::with(['customer','account','bankAccount','lines.account','payments.account','createdBy'])
            ->findOrFail($id);
        return $this->success($invoice);
    }

    /* ── Pre-invoice "Sales Order" CRUD is intentionally not exposed here.
     *   The page is a read-only daily aggregator. If a true SO workflow is
     *   added later, these endpoints can be wired against the existing
     *   sales_orders table. ────────────────────────────────────────────── */
    public function store(Request $request): JsonResponse
    {
        return $this->error('Sales Order create is not exposed — use Sale Invoice or POS to record a sale.', 501);
    }
    public function update(Request $request, $id): JsonResponse
    {
        return $this->error('Sales Order update is not exposed.', 501);
    }
    public function destroy($id): JsonResponse
    {
        return $this->error('Sales Order delete is not exposed.', 501);
    }
    public function convertToInvoice($id): JsonResponse
    {
        return $this->error('Convert-to-invoice is not exposed in the aggregator view.', 501);
    }

    private function resolveRange(Request $request): array
    {
        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : now()->startOfDay();
        $to   = $request->to   ? Carbon::parse($request->to)->endOfDay()     : now()->endOfDay();
        if ($from->gt($to)) [$from, $to] = [$to, $from];
        return [$from, $to];
    }
}
