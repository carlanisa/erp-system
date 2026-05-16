<?php

namespace App\Services\Accounting;

use App\Models\Accounting\Invoice;
use App\Models\Accounting\InvoiceItem;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function create(array $data): Invoice
    {
        return DB::transaction(function () use ($data) {
            $subtotal   = 0;
            $taxAmount  = 0;

            foreach ($data['items'] as $item) {
                $lineTotal  = $item['quantity'] * $item['unit_price'];
                $lineTax    = $lineTotal * (($item['tax_rate'] ?? 0) / 100);
                $subtotal  += $lineTotal;
                $taxAmount += $lineTax;
            }

            $invoice = Invoice::create([
                'number'      => $this->generateNumber(),
                'customer_id' => $data['customer_id'],
                'date'        => $data['date'],
                'due_date'    => $data['due_date'],
                'status'      => 'draft',
                'subtotal'    => $subtotal,
                'tax_amount'  => $taxAmount,
                'total'       => $subtotal + $taxAmount,
                'notes'       => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'tax_rate'    => $item['tax_rate'] ?? 0,
                    'total'       => $lineTotal,
                ]);
            }

            return $invoice;
        });
    }

    private function generateNumber(): string
    {
        $last = Invoice::orderByRaw("CAST(SUBSTRING(number FROM 5) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->number, 4)) + 1 : 1;
        $number = 'INV-' . str_pad($next, 4, '0', STR_PAD_LEFT);

        while (Invoice::where('number', $number)->exists()) {
            $next++;
            $number = 'INV-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        }
        return $number;
    }
}
