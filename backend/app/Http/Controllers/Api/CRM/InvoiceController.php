<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\CrmInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    use ApiResponse;

    public function index(Request $r): JsonResponse
    {
        $q = CrmInvoice::with(['customer','items','payments'])
            ->when($r->search, fn($qq) => $qq->where(fn($w) =>
                $w->where('invoice_no','like',"%{$r->search}%")
                  ->orWhere('customer_invoice_no','like',"%{$r->search}%")
                  ->orWhere('reference','like',"%{$r->search}%")
                  ->orWhere('walk_in_name','like',"%{$r->search}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name','like',"%{$r->search}%"))))
            ->when($r->status, fn($qq) => $qq->where('status', $r->status))
            ->when($r->branch_code, fn($qq) => $qq->where('branch_code', $r->branch_code))
            ->when($r->from, fn($qq) => $qq->whereDate('date','>=', $r->from))
            ->when($r->to,   fn($qq) => $qq->whereDate('date','<=', $r->to))
            ->orderByDesc('id');

        $page = $q->paginate((int) ($r->per_page ?? 50));

        $grand = (clone $q)->where('is_cancelled', false)->sum('amount');
        $resp = $this->paginated($page);
        $arr = $resp->getData(true);
        $arr['meta']['grand_total'] = (float) $grand;
        return response()->json($arr);
    }

    public function store(Request $r): JsonResponse
    {
        $data = $this->validateData($r);
        $data['invoice_no'] = $this->nextNo();
        return DB::transaction(function () use ($data) {
            $items     = $data['lines']    ?? [];
            $payments  = $data['payments'] ?? [];
            unset($data['lines'], $data['payments']);
            if (empty($data['status'])) $data['status'] = 'sent';
            $inv = CrmInvoice::create($data);
            $this->saveItems($inv, $items);
            $this->savePayments($inv, $payments);
            return $this->success($inv->load(['items','payments','customer']), 'Created', 201);
        });
    }

    public function show(CrmInvoice $invoice): JsonResponse
    {
        return $this->success($invoice->load(['customer','items','payments']));
    }

    public function update(Request $r, CrmInvoice $invoice): JsonResponse
    {
        $data = $this->validateData($r, true);
        return DB::transaction(function () use ($data, $invoice) {
            $items    = $data['lines']    ?? null;
            $payments = $data['payments'] ?? null;
            unset($data['lines'], $data['payments']);
            $invoice->update($data);
            if ($items !== null) {
                $invoice->items()->delete();
                $this->saveItems($invoice, $items);
            }
            if ($payments !== null) {
                $invoice->payments()->delete();
                $this->savePayments($invoice, $payments);
            }
            return $this->success($invoice->load(['items','payments','customer']), 'Updated');
        });
    }

    public function destroy(CrmInvoice $invoice): JsonResponse
    {
        $invoice->delete();
        return $this->success(null, 'Deleted');
    }

    public function cancel(CrmInvoice $invoice): JsonResponse
    {
        $invoice->update([
            'status'       => $invoice->is_cancelled ? 'sent' : 'cancelled',
            'is_cancelled' => !$invoice->is_cancelled,
        ]);
        return $this->success($invoice, $invoice->is_cancelled ? 'Cancelled' : 'Restored');
    }

    public function pdf(CrmInvoice $invoice, \App\Services\PdfRenderer $renderer)
    {
        $pdf = $renderer->crmInvoice($invoice);
        return $pdf->stream("{$invoice->invoice_no}.pdf");
    }

    private function validateData(Request $r, bool $partial = false): array
    {
        return $r->validate([
            'date'                => ($partial ? 'sometimes' : 'required').'|date',
            'due_date'            => 'nullable|date',
            'terms'               => 'nullable|string|max:32',
            'branch_code'         => 'nullable|string|max:16',
            'customer_id'         => 'nullable|exists:customers,id',
            'walk_in_name'        => 'nullable|string|max:255',
            'customer_invoice_no' => 'nullable|string|max:64',
            'payment_method'      => 'nullable|string|max:32',
            'cheque_number'       => 'nullable|string|max:64',
            'bank_charges'        => 'nullable|numeric|min:0',
            'bank_account_id'     => 'nullable|integer',
            'reference'           => 'nullable|string|max:255',
            'agent'               => 'nullable|string|max:32',
            'area'                => 'nullable|string|max:32',
            'notes'               => 'nullable|string',
            'status'              => 'nullable|in:draft,sent,partial,paid,cancelled',

            'lines'                       => 'nullable|array',
            'lines.*.description'         => 'nullable|string',
            'lines.*.item_code'           => 'nullable|string|max:64',
            'lines.*.parent_sku'          => 'nullable|string|max:64',
            'lines.*.color'               => 'nullable|string|max:64',
            'lines.*.size'                => 'nullable|string|max:32',
            'lines.*.uom'                 => 'nullable|string|max:16',
            'lines.*.qty'                 => 'nullable|numeric|min:0',
            'lines.*.roll_count'          => 'nullable|numeric|min:0',
            'lines.*.unit_price'          => 'nullable|numeric|min:0',
            'lines.*.discount'            => 'nullable|numeric|min:0',
            'lines.*.discount_pct'        => 'nullable|numeric|min:0|max:100',
            'lines.*.tax_pct'             => 'nullable|numeric|min:0|max:100',
            'lines.*.amount'              => 'nullable|numeric',

            'payments'                    => 'nullable|array',
            'payments.*.account_id'       => 'nullable|integer',
            'payments.*.payee'            => 'nullable|string|max:255',
            'payments.*.code'             => 'nullable|string|max:64',
            'payments.*.payment_date'     => 'required_with:payments|date',
            'payments.*.amount'           => 'required_with:payments|numeric|min:0',
            'payments.*.payment_method'   => 'nullable|string|max:32',
            'payments.*.cheque_number'    => 'nullable|string|max:64',
            'payments.*.reference'        => 'nullable|string|max:255',
            'payments.*.notes'            => 'nullable|string',
        ]);
    }

    private function saveItems(CrmInvoice $inv, array $items): void
    {
        $sub = 0; $disc = 0; $tax = 0; $total = 0;
        foreach ($items as $i) {
            $qty   = (float) ($i['qty'] ?? 0);
            $price = (float) ($i['unit_price'] ?? 0);
            $dAmt  = (float) ($i['discount'] ?? 0);
            $dPct  = (float) ($i['discount_pct'] ?? 0);
            $tPct  = (float) ($i['tax_pct'] ?? 0);

            $gross = $qty * $price;
            // Both discount % and flat discount supported (flat takes precedence if set)
            $discAmt = $dAmt > 0 ? $dAmt : $gross * ($dPct / 100);
            $afterDisc = max(0, $gross - $discAmt);
            $taxAmt = $afterDisc * ($tPct / 100);
            // If client passed an explicit amount, honour it (mirrors PI override)
            $line = isset($i['amount']) && $i['amount'] !== ''
                ? (float) $i['amount']
                : $afterDisc + $taxAmt;

            $inv->items()->create([
                'description' => $i['description']  ?? '',
                'item_code'   => $i['item_code']    ?? null,
                'parent_sku'  => $i['parent_sku']   ?? null,
                'color'       => $i['color']        ?? null,
                'size'        => $i['size']         ?? null,
                'uom'         => $i['uom']          ?? 'UNIT',
                'qty'         => $qty,
                'roll_count'  => (float) ($i['roll_count'] ?? 0),
                'unit_price'  => $price,
                'discount_pct'=> $dPct,
                'discount'    => $discAmt,
                'tax_pct'     => $tPct,
                'line_total'  => $line,
            ]);
            $sub   += $gross;
            $disc  += $discAmt;
            $tax   += $taxAmt;
            $total += $line;
        }
        $inv->update([
            'subtotal'       => $sub,
            'discount_total' => $disc,
            'tax_total'      => $tax,
            'amount'         => $total,
        ]);
    }

    private function savePayments(CrmInvoice $inv, array $payments): void
    {
        $paid = 0;
        foreach ($payments as $p) {
            $inv->payments()->create([
                'account_id'      => $p['account_id'] ?? null,
                'payee'           => $p['payee'] ?? null,
                'code'            => $p['code'] ?? null,
                'payment_date'    => $p['payment_date'],
                'amount'          => (float) $p['amount'],
                'payment_method'  => $p['payment_method'] ?? 'cash',
                'cheque_number'   => $p['cheque_number'] ?? null,
                'reference'       => $p['reference'] ?? null,
                'notes'           => $p['notes'] ?? null,
            ]);
            $paid += (float) $p['amount'];
        }
        $newStatus = $inv->is_cancelled ? 'cancelled'
                   : ($paid <= 0 ? ($inv->status === 'draft' ? 'draft' : 'sent')
                                 : ($paid >= $inv->amount && $inv->amount > 0 ? 'paid' : 'partial'));
        $inv->update([
            'paid_amount' => $paid,
            'status'      => $newStatus,
        ]);
    }

    private function nextNo(): string
    {
        $yr = date('Y');
        $last = CrmInvoice::whereYear('created_at', $yr)->orderByDesc('id')->first();
        $n = $last ? ((int) substr($last->invoice_no, -5)) + 1 : 1;
        return 'CI-'.$yr.'-'.str_pad($n, 5, '0', STR_PAD_LEFT);
    }
}
