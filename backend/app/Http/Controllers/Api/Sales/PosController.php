<?php
namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\Product;
use App\Models\Inventory\StockLocation;
use App\Models\Sales\SaleInvoice;
use App\Services\Sales\SaleInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * POS endpoints — sit on top of SaleInvoice (source='pos').
 * Frontend: full-screen kiosk page that calls these.
 */
class PosController extends Controller
{
    use ApiResponse;

    public function __construct(private SaleInvoiceService $sales) {}

    /**
     * Product feed for the POS grid. Returns active products with variants,
     * pre-formatted for the cashier (sale price, available stock, image).
     * No pagination — POS expects a complete catalogue at boot, then filters client-side.
     */
    public function products(Request $request): JsonResponse
    {
        // Branch list (POS shows physical locations + their per-variant stock)
        $branches = StockLocation::where('type', 'store')
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'code', 'name'])
            ->map(fn($l) => ['id' => $l->id, 'code' => $l->code, 'name' => $l->name])
            ->values();
        $branchCodes = $branches->pluck('code')->all();

        $products = Product::with([
                'variants' => fn($q) => $q->where('is_active', true),
                'variants.locationStocks.location',
                'locationStocks.location',
            ])
            ->where('is_active', true)
            ->when($request->category, fn($q,$c) => $q->where('category', $c))
            ->when($request->search,   fn($q,$s) =>
                $q->where(fn($q2) => $q2
                    ->where('name', 'ilike', "%$s%")
                    ->orWhere('sku', 'ilike', "%$s%")
                    ->orWhere('barcode', 'ilike', "%$s%"))
            )
            ->orderBy('name')
            ->get()
            ->map(function (Product $p) use ($branchCodes) {
                $channels = is_array($p->channels) ? $p->channels : [];
                $totalStock = (float) $p->stock;

                return [
                    'id'             => $p->id,
                    'sku'            => $p->sku,
                    'barcode'        => $p->barcode,
                    'name'           => $p->name,
                    'category'       => $p->category,
                    'image_url'      => $p->featured_image_url ?: $p->image_path,
                    'sale_price'     => (float) $p->sale_price,
                    'tax_rate'       => (float) $p->tax_rate,
                    'stock'          => $totalStock,
                    'uom'            => $p->uom ?: 'UNIT',
                    'has_variants'   => $p->variants->isNotEmpty(),
                    // Per-branch stock for the parent product (used when product has no variants)
                    'locations'      => $this->buildLocationMap($p->locationStocks, $branchCodes),
                    // Online channels — all see the same total pool
                    'channels'       => $this->buildChannelMap($channels, $totalStock),
                    'variants'       => $p->variants->map(fn($v) => [
                        'id'         => $v->id,
                        'sku'        => $v->sku,
                        'barcode'    => $v->barcode,
                        'color'      => $v->color,
                        'size'       => $v->size,
                        'label'      => $v->display_name,
                        'sale_price' => (float) ($v->sale_price ?: $p->sale_price),
                        'stock'      => (float) $v->available_stock,
                        'locations'  => $this->buildLocationMap($v->locationStocks, $branchCodes),
                        'channels'   => $this->buildChannelMap($channels, (float) $v->available_stock),
                    ])->values(),
                ];
            });

        $categories = Product::where('is_active', true)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->select('category')->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        return $this->success([
            'products'   => $products,
            'categories' => $categories,
            'branches'   => $branches,
        ]);
    }

    /**
     * Returns ordered ['HQ' => 5, 'SHAHALAM' => 5, 'KL' => 0, 'BANGI' => 0]
     * Rows missing in DB show as 0 so the UI always renders the same columns.
     */
    private function buildLocationMap($balances, array $branchCodes): array
    {
        $byCode = [];
        foreach ($balances as $b) {
            if ($b->location) $byCode[$b->location->code] = (float) $b->qty;
        }
        $out = [];
        foreach ($branchCodes as $code) $out[$code] = $byCode[$code] ?? 0.0;
        return $out;
    }

    /**
     * Online platforms see the full pool. Returns ['shopee_my' => 10, 'website' => 10, ...].
     * Skips 'pos' (it's the till itself, not a remote channel).
     */
    private function buildChannelMap(array $channels, float $totalStock): array
    {
        $out = [];
        foreach ($channels as $c) {
            if ($c === 'pos') continue;
            $out[$c] = $totalStock;
        }
        return $out;
    }

    /**
     * Atomic POS checkout. Accepts a cart payload, creates a SaleInvoice
     * with source='pos', applies stock decrements, records the payment,
     * returns the saved invoice (frontend prints receipt from the response).
     */
    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'                  => 'nullable|date',
            'branch_code'           => 'nullable|string|max:20',
            'customer_id'           => 'nullable|exists:customers,id',
            'walk_in_name'          => 'nullable|string|max:100',
            'discount_total'        => 'nullable|numeric|min:0',
            'tax_total'             => 'nullable|numeric|min:0',
            'amount'                => 'required|numeric|min:0',
            'reference'             => 'nullable|string|max:100',
            'notes'                 => 'nullable|string|max:500',
            'lines'                 => 'required|array|min:1',
            'lines.*.item_code'     => 'nullable|string|max:100',
            'lines.*.description'   => 'required|string|max:255',
            'lines.*.color'         => 'nullable|string|max:100',
            'lines.*.size'          => 'nullable|string|max:100',
            'lines.*.qty'           => 'required|numeric|min:0.001',
            'lines.*.uom'           => 'nullable|string|max:20',
            'lines.*.unit_price'    => 'required|numeric|min:0',
            'lines.*.discount'      => 'nullable|numeric|min:0',
            'lines.*.tax_rate'      => 'nullable|numeric|min:0|max:100',
            'lines.*.tax_amount'    => 'nullable|numeric|min:0',
            'lines.*.amount'        => 'required|numeric|min:0',
            'payment'               => 'required|array',
            'payment.method'        => 'required|in:cash,card,bank_transfer',
            'payment.amount'        => 'required|numeric|min:0',         // applied to invoice
            'payment.tendered'      => 'nullable|numeric|min:0',         // cash given (cash only)
            'payment.account_id'    => 'nullable|exists:accounts,id',    // bank/cash GL account
            'payment.reference'     => 'nullable|string|max:100',
        ]);

        $tendered = (float) ($data['payment']['tendered'] ?? $data['payment']['amount']);
        $applied  = (float) $data['payment']['amount'];
        $change   = max(0, $tendered - $applied);

        $invoice = $this->sales->createWithLines(
            data: [
                'source'         => 'pos',
                'date'           => $data['date'] ?? now()->toDateString(),
                'branch_code'    => $data['branch_code'] ?? 'HQ',
                'customer_id'    => $data['customer_id'] ?? null,
                'walk_in_name'   => $data['walk_in_name'] ?? null,
                'amount'         => $data['amount'],
                'paid_amount'    => $applied,
                'change_amount'  => $change,
                'discount_total' => $data['discount_total'] ?? 0,
                'tax_total'      => $data['tax_total']      ?? 0,
                'payment_method' => $data['payment']['method'],
                'reference'      => $data['reference'] ?? null,
                'description'    => $data['notes']     ?? null,
                'status'         => 'posted',
                'is_cancelled'   => false,
                'created_by'     => $request->user()->id,
                'bank_account_id'=> $data['payment']['account_id'] ?? null,
            ],
            lines: $data['lines'],
            payment: [
                'amount'          => $applied,
                'tendered_amount' => $tendered,
                'payment_method'  => $data['payment']['method'],
                'account_id'      => $data['payment']['account_id'] ?? null,
                'reference'       => $data['payment']['reference']  ?? null,
                'received_from'   => $data['walk_in_name'] ?? null,
            ],
        );

        return $this->success([
            'invoice' => $invoice,
            'change'  => $change,
        ], 'Sale completed', 201);
    }

    /**
     * Receipt payload (JSON). Frontend renders printable HTML from this.
     * Future: server-side PDF via PdfRenderer.
     */
    public function receipt(int $invoiceId): JsonResponse
    {
        $invoice = SaleInvoice::with(['customer','lines','payments','createdBy'])
            ->where('id', $invoiceId)
            ->firstOrFail();

        return $this->success([
            'invoice'   => $invoice,
            'company'   => [
                'name'    => config('app.name', 'Mayne AB ERP'),
                'address' => null,
                'phone'   => null,
            ],
            'printed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Today (or any date) end-of-day summary for the cashier:
     * total invoices, gross sales, breakdown by payment method, drawer expected.
     */
    public function dailyClose(Request $request): JsonResponse
    {
        $date    = $request->date ? Carbon::parse($request->date) : now();
        $cashier = $request->user();

        $base = SaleInvoice::where('source', 'pos')
            ->where('is_cancelled', false)
            ->whereDate('date', $date->toDateString())
            ->when($request->mine, fn($q) => $q->where('created_by', $cashier->id));

        $totalInvoices = (clone $base)->count();
        $grossSales    = (float) (clone $base)->sum('amount');
        $totalChange   = (float) (clone $base)->sum('change_amount');

        $byMethod = (clone $base)
            ->selectRaw('payment_method, count(*) as count, sum(amount) as total, sum(change_amount) as change')
            ->groupBy('payment_method')
            ->get()
            ->map(fn($r) => [
                'method' => $r->payment_method,
                'count'  => (int) $r->count,
                'total'  => (float) $r->total,
                'change' => (float) $r->change,
            ]);

        $cashRow      = $byMethod->firstWhere('method', 'cash');
        $cashExpected = $cashRow ? (float) $cashRow['total'] : 0.0;

        return $this->success([
            'date'           => $date->toDateString(),
            'cashier'        => ['id' => $cashier->id, 'name' => $cashier->name],
            'total_invoices' => $totalInvoices,
            'gross_sales'    => $grossSales,
            'total_change'   => $totalChange,
            'by_method'      => $byMethod,
            'cash_expected'  => $cashExpected,
        ]);
    }
}
