<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend crm_invoices with header fields used by Customer Invoice (mirrors purchase_invoices)
        Schema::table('crm_invoices', function (Blueprint $t) {
            $t->string('customer_invoice_no', 64)->nullable()->after('invoice_no');
            $t->string('terms', 32)->default('Net 30')->after('due_date');
            $t->string('agent', 32)->default('NA')->after('reference');
            $t->string('area', 32)->default('NA')->after('agent');
            $t->string('cheque_number', 64)->nullable()->after('payment_method');
            $t->decimal('bank_charges', 14, 2)->default(0)->after('cheque_number');
            $t->foreignId('bank_account_id')->nullable()->after('bank_charges');
        });

        // Extend crm_invoice_items with inventory product columns (mirrors purchase_invoice_lines)
        Schema::table('crm_invoice_items', function (Blueprint $t) {
            $t->string('item_code', 64)->nullable()->after('description');
            $t->string('parent_sku', 64)->nullable()->after('item_code');
            $t->string('color', 64)->nullable()->after('parent_sku');
            $t->string('size', 32)->nullable()->after('color');
            $t->string('uom', 16)->default('UNIT')->after('size');
            $t->decimal('roll_count', 14, 3)->default(0)->after('qty');
            $t->decimal('discount', 14, 2)->default(0)->after('discount_pct');
        });

        // Inline installment payments (one row per kisht received)
        Schema::create('crm_invoice_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('invoice_id')->constrained('crm_invoices')->cascadeOnDelete();
            $t->foreignId('account_id')->nullable();   // bank/cash GL account
            $t->string('payee', 255)->nullable();      // customer name / received from
            $t->string('code', 64)->nullable();        // customer code (mirrors PI behaviour)
            $t->date('payment_date');
            $t->decimal('amount', 14, 2)->default(0);
            $t->string('payment_method', 32)->default('cash');
            $t->string('cheque_number', 64)->nullable();
            $t->string('reference', 255)->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['invoice_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_invoice_payments');
        Schema::table('crm_invoice_items', function (Blueprint $t) {
            $t->dropColumn(['item_code','parent_sku','color','size','uom','roll_count','discount']);
        });
        Schema::table('crm_invoices', function (Blueprint $t) {
            $t->dropColumn(['customer_invoice_no','terms','agent','area','cheque_number','bank_charges','bank_account_id']);
        });
    }
};
