<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\Quotation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    use ApiResponse;

    public function index(Request $r): JsonResponse
    {
        $q = Quotation::with(['customer','lead','items'])
            ->when($r->search, fn($qq) => $qq->where(fn($w) =>
                $w->where('quote_no','like',"%{$r->search}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name','like',"%{$r->search}%"))))
            ->when($r->status, fn($qq) => $qq->where('status', $r->status))
            ->orderByDesc('id');

        return $this->paginated($q->paginate((int) ($r->per_page ?? 20)));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $this->validateData($r);
        $data['quote_no'] = $this->nextQuoteNo();
        return DB::transaction(function () use ($data) {
            $items = $data['items'] ?? [];
            unset($data['items']);
            $quote = Quotation::create($data);
            $this->saveItems($quote, $items);
            return $this->success($quote->load('items'), 'Created', 201);
        });
    }

    public function show(Quotation $quotation): JsonResponse
    {
        return $this->success($quotation->load(['customer','lead','items']));
    }

    public function update(Request $r, Quotation $quotation): JsonResponse
    {
        $data = $this->validateData($r, true);
        return DB::transaction(function () use ($data, $quotation) {
            $items = $data['items'] ?? null;
            unset($data['items']);
            $quotation->update($data);
            if ($items !== null) {
                $quotation->items()->delete();
                $this->saveItems($quotation, $items);
            }
            return $this->success($quotation->load('items'), 'Updated');
        });
    }

    public function destroy(Quotation $quotation): JsonResponse
    {
        $quotation->delete();
        return $this->success(null, 'Deleted');
    }

    private function validateData(Request $r, bool $partial = false): array
    {
        return $r->validate([
            'date' => ($partial ? 'sometimes' : 'required').'|date',
            'valid_until' => 'nullable|date',
            'customer_id' => 'nullable|exists:customers,id',
            'lead_id' => 'nullable|exists:crm_leads,id',
            'walk_in_name' => 'nullable|string|max:255',
            'status' => 'nullable|in:draft,sent,accepted,rejected,expired',
            'terms' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.description' => 'required_with:items|string',
            'items.*.qty' => 'required_with:items|numeric|min:0',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.discount_pct' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_pct' => 'nullable|numeric|min:0|max:100',
        ]);
    }

    private function saveItems(Quotation $q, array $items): void
    {
        $sub = 0; $disc = 0; $tax = 0; $total = 0;
        foreach ($items as $i) {
            $qty = (float) ($i['qty'] ?? 0);
            $price = (float) ($i['unit_price'] ?? 0);
            $dPct = (float) ($i['discount_pct'] ?? 0);
            $tPct = (float) ($i['tax_pct'] ?? 0);
            $gross = $qty * $price;
            $afterDisc = $gross * (1 - $dPct / 100);
            $taxAmt = $afterDisc * ($tPct / 100);
            $line = $afterDisc + $taxAmt;

            $q->items()->create([
                'description' => $i['description'],
                'qty' => $qty,
                'unit_price' => $price,
                'discount_pct' => $dPct,
                'tax_pct' => $tPct,
                'line_total' => $line,
            ]);
            $sub += $gross;
            $disc += $gross - $afterDisc;
            $tax += $taxAmt;
            $total += $line;
        }
        $q->update([
            'subtotal' => $sub, 'discount_total' => $disc,
            'tax_total' => $tax, 'amount' => $total,
        ]);
    }

    private function nextQuoteNo(): string
    {
        $yr = date('Y');
        $last = Quotation::whereYear('created_at', $yr)->orderByDesc('id')->first();
        $n = $last ? ((int) substr($last->quote_no, -5)) + 1 : 1;
        return 'QT-'.$yr.'-'.str_pad($n, 5, '0', STR_PAD_LEFT);
    }
}
