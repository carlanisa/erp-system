<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sale_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('si_number')->unique();                  // SI-00001 (internal)
            $table->string('customer_invoice_no')->nullable();      // optional external/printed ref
            $table->string('branch_code', 20)->default('HQ');
            $table->string('source', 20)->default('erp');           // erp | pos | online
            $table->date('date');
            $table->date('due_date')->nullable();
            $table->date('posting_date')->nullable();
            $table->date('payment_date')->nullable();
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');         // A/R or income default
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts');    // cash/bank received into
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('bank_charges', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->string('payment_method')->default('cash');      // cash | cheque | bank_transfer | card
            $table->string('cheque_number')->nullable();
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->string('agent')->nullable();
            $table->string('area')->nullable();
            $table->string('status')->default('draft');             // draft | posted
            $table->boolean('is_cancelled')->default(false);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['date', 'branch_code']);
            $table->index('source');
        });

        Schema::create('sale_invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_invoice_id')->constrained('sale_invoices')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');
            $table->string('item_code')->nullable();                // Product / ProductVariant SKU
            $table->string('description')->nullable();
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->decimal('qty', 15, 3)->default(1);
            $table->decimal('roll_count', 15, 3)->default(0);
            $table->string('uom', 20)->default('UNIT');
            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('discount', 15, 2)->default(0);         // line-level discount
            $table->decimal('tax_rate', 5, 2)->default(0);          // % tax
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('amount', 15, 2);                       // net line total
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['sale_invoice_id', 'sort_order']);
            $table->index('item_code');
        });

        Schema::create('sale_invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_invoice_id')->constrained('sale_invoices')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');   // bank/cash account credited
            $table->string('received_from')->nullable();            // customer name snapshot
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('cash');
            $table->string('reference')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['sale_invoice_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_invoice_payments');
        Schema::dropIfExists('sale_invoice_lines');
        Schema::dropIfExists('sale_invoices');
    }
};
