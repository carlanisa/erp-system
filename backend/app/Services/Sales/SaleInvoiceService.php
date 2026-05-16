<?php
namespace App\Services\Sales;

use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use App\Models\Sales\SaleInvoice;
use Illuminate\Support\Facades\DB;

/**
 * Shared logic for any flow that writes to sale_invoices:
 * the standard ERP Sale Invoice screen, POS checkout, future quotation→invoice conversion, etc.
 *
 * Single source of truth for: number generation, atomic create-with-lines-and-payments,
 * stock decrement on save, stock restore on cancel/delete.
 */
class SaleInvoiceService
{
    /**
     * Atomically create a SaleInvoice with its lines, an optional payment row,
     * and apply stock deltas. Caller is responsible for validation.
     *
     * @param  array  $data    invoice header fields (incl. created_by, branch_code, source)
     * @param  array  $lines   line item rows
     * @param  array  $payment optional single payment row (POS pays in full at sale time)
     */
    public function createWithLines(array $data, array $lines, ?array $payment = null): SaleInvoice
    {
        return DB::transaction(function () use ($data, $lines, $payment) {
            $data['si_number']   = $data['si_number']   ?? $this->generateNumber($data['source'] ?? 'erp');
            $data['branch_code'] = $data['branch_code'] ?? 'HQ';
            $data['source']      = $data['source']      ?? 'erp';

            // Fall back to first line's account if header didn't pick one
            if (empty($data['account_id']) && !empty($lines)) {
                $data['account_id'] = $lines[0]['account_id'] ?? null;
            }

            $invoice = SaleInvoice::create($data);

            foreach ($lines as $i => $line) {
                $invoice->lines()->create([
                    'account_id'  => $line['account_id'] ?? null,
                    'item_code'   => $line['item_code']  ?? null,
                    'description' => $line['description'] ?? null,
                    'color'       => $line['color']      ?? null,
                    'size'        => $line['size']       ?? null,
                    'qty'         => $line['qty']        ?? 1,
                    'roll_count'  => $line['roll_count'] ?? 0,
                    'uom'         => $line['uom']        ?? 'UNIT',
                    'unit_price'  => $line['unit_price'] ?? 0,
                    'discount'    => $line['discount']   ?? 0,
                    'tax_rate'    => $line['tax_rate']   ?? 0,
                    'tax_amount'  => $line['tax_amount'] ?? 0,
                    'amount'      => $line['amount'],
                    'sort_order'  => $i,
                ]);
                // Sale → reduce stock by qty
                $this->applyStockDelta($line['item_code'] ?? null, -1 * (float) ($line['qty'] ?? 0));
            }

            if ($payment !== null) {
                $invoice->payments()->create([
                    'account_id'      => $payment['account_id']      ?? $invoice->bank_account_id,
                    'received_from'   => $payment['received_from']   ?? null,
                    'payment_date'    => $payment['payment_date']    ?? $invoice->date,
                    'amount'          => $payment['amount'],
                    'tendered_amount' => $payment['tendered_amount'] ?? null,
                    'payment_method'  => $payment['payment_method']  ?? $invoice->payment_method,
                    'reference'       => $payment['reference']       ?? null,
                    'notes'           => $payment['notes']           ?? null,
                    'created_by'      => $invoice->created_by,
                ]);
                $invoice->update([
                    'paid_amount'  => (float) $invoice->payments()->sum('amount'),
                    'payment_date' => $payment['payment_date'] ?? $invoice->date,
                ]);
            }

            return $invoice->fresh(['customer','lines.account','payments.account']);
        });
    }

    /**
     * Reverse the stock impact for every line of an invoice. Used by cancel & delete.
     */
    public function reverseStock(SaleInvoice $invoice): void
    {
        foreach ($invoice->lines as $line) {
            // Original sale subtracted qty; reversal adds it back
            $this->applyStockDelta($line->item_code, (float) $line->qty);
        }
    }

    /**
     * Apply (signed) qty delta to the matching ProductVariant or Product by SKU.
     * Negative = sale (out), positive = return (in). Silently skips free-text SKUs.
     */
    public function applyStockDelta(?string $sku, float $qty): void
    {
        if (!$sku || $qty == 0.0) return;

        $variant = ProductVariant::where('sku', $sku)->first();
        if ($variant) {
            $variant->stock = max(0, ((float) $variant->stock) + $qty);
            $variant->save();
            $product = $variant->product;
            if ($product) {
                $product->stock = max(0, $product->variants()->sum('stock'));
                $product->save();
            }
            return;
        }

        $product = Product::where('sku', $sku)->first();
        if ($product) {
            $product->stock = max(0, ((float) $product->stock) + $qty);
            $product->save();
        }
    }

    /**
     * Next invoice number. POS uses POS-NNNNN sequence; everything else SI-NNNNN.
     * Both share the sale_invoices.si_number column but live in distinct numeric ranges.
     */
    public function generateNumber(string $source = 'erp'): string
    {
        $prefix = $source === 'pos' ? 'POS-' : 'SI-';
        $len    = strlen($prefix);

        $last = SaleInvoice::where('si_number', 'like', "$prefix%")
            ->orderByRaw("CAST(SUBSTRING(si_number FROM " . ($len + 1) . ") AS INTEGER) DESC")
            ->first();

        $next = $last ? ((int) substr($last->si_number, $len)) + 1 : 1;
        $num  = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);

        // Defensive: if a race produced a duplicate, walk forward
        while (SaleInvoice::where('si_number', $num)->exists()) {
            $next++;
            $num = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
        }

        return $num;
    }
}
