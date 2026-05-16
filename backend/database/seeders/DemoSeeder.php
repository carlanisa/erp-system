<?php

namespace Database\Seeders;

use App\Models\CRM\Customer;
use App\Models\Accounting\Invoice;
use App\Models\Accounting\InvoiceItem;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['name' => 'Ahmad Traders',    'email' => 'ahmad@traders.pk',   'phone' => '0300-1234567', 'city' => 'Karachi'],
            ['name' => 'Khan & Sons',      'email' => 'info@khansons.pk',   'phone' => '0321-9876543', 'city' => 'Lahore'],
            ['name' => 'Ali Enterprises',  'email' => 'ali@enterprises.pk', 'phone' => '0333-5551234', 'city' => 'Islamabad'],
            ['name' => 'Raza Corporation', 'email' => 'raza@corp.pk',       'phone' => '0345-7890123', 'city' => 'Faisalabad'],
            ['name' => 'Star Textiles',    'email' => 'star@textiles.pk',   'phone' => '0311-2345678', 'city' => 'Sialkot'],
            ['name' => 'Blue Ocean Ltd',   'email' => 'info@blueocean.pk',  'phone' => '0302-3456789', 'city' => 'Karachi'],
        ];

        $created = collect($customers)->map(fn($c) => Customer::create($c));

        $invoices = [
            ['customer' => 0, 'status' => 'paid',    'days' => -15, 'items' => [
                ['description' => 'Web Development Services', 'qty' => 1,   'price' => 35000, 'tax' => 0],
                ['description' => 'Domain & Hosting',          'qty' => 1,  'price' => 5000,  'tax' => 0],
            ]],
            ['customer' => 1, 'status' => 'sent',    'days' => -5, 'items' => [
                ['description' => 'Accounting Consultation',   'qty' => 5,  'price' => 4500,  'tax' => 5],
                ['description' => 'Report Preparation',        'qty' => 2,  'price' => 2000,  'tax' => 0],
            ]],
            ['customer' => 2, 'status' => 'overdue', 'days' => -40, 'items' => [
                ['description' => 'ERP Implementation',        'qty' => 1,  'price' => 55000, 'tax' => 5],
                ['description' => 'Training Sessions',         'qty' => 3,  'price' => 5000,  'tax' => 0],
            ]],
            ['customer' => 3, 'status' => 'paid',    'days' => -8, 'items' => [
                ['description' => 'Logo Design',               'qty' => 1,  'price' => 8000,  'tax' => 0],
                ['description' => 'Business Cards (500 pcs)',  'qty' => 1,  'price' => 3500,  'tax' => 0],
            ]],
            ['customer' => 4, 'status' => 'draft',   'days' => 0, 'items' => [
                ['description' => 'Marketing Campaign',        'qty' => 1,  'price' => 25000, 'tax' => 0],
                ['description' => 'Social Media Management',   'qty' => 1,  'price' => 8000,  'tax' => 0],
            ]],
            ['customer' => 5, 'status' => 'sent',    'days' => -3, 'items' => [
                ['description' => 'IT Support - Monthly',      'qty' => 1,  'price' => 12000, 'tax' => 0],
            ]],
        ];

        foreach ($invoices as $i => $inv) {
            $subtotal = 0;
            $taxAmount = 0;

            foreach ($inv['items'] as $item) {
                $line = $item['qty'] * $item['price'];
                $tax  = $line * ($item['tax'] / 100);
                $subtotal  += $line;
                $taxAmount += $tax;
            }

            $date    = now()->addDays($inv['days']);
            $dueDate = (clone $date)->addDays(30);

            $invoice = Invoice::create([
                'number'      => 'INV-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'customer_id' => $created[$inv['customer']]->id,
                'date'        => $date->format('Y-m-d'),
                'due_date'    => $dueDate->format('Y-m-d'),
                'status'      => $inv['status'],
                'subtotal'    => $subtotal,
                'tax_amount'  => $taxAmount,
                'total'       => $subtotal + $taxAmount,
            ]);

            foreach ($inv['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'description' => $item['description'],
                    'quantity'    => $item['qty'],
                    'unit_price'  => $item['price'],
                    'tax_rate'    => $item['tax'],
                    'total'       => $item['qty'] * $item['price'],
                ]);
            }
        }
    }
}
