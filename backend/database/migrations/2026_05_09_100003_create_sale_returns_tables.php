<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->string('sr_number')->unique();                  // SR-00001
            $table->string('branch_code', 20)->default('HQ');
            $table->date('date');
            $table->date('posting_date')->nullable();
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sale_invoice_id')->nullable()->constrained('sale_invoices')->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');         // sales-return / contra-revenue
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts');    // refund paid from
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('refunded_amount', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->string('settlement_method')->default('credit_note'); // credit_note | cash_refund | bank_refund
            $table->string('reason')->nullable();                   // damaged | wrong_item | not_satisfied | other
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->string('agent')->nullable();
            $table->string('area')->nullable();
            $table->string('status')->default('draft');             // draft | posted
            $table->boolean('is_cancelled')->default(false);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['date', 'branch_code']);
        });

        Schema::create('sale_return_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained('sale_returns')->cascadeOnDelete();
            $table->foreignId('sale_invoice_line_id')->nullable()->constrained('sale_invoice_lines')->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');
            $table->string('item_code')->nullable();
            $table->string('description')->nullable();
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->decimal('qty', 15, 3)->default(1);
            $table->decimal('roll_count', 15, 3)->default(0);
            $table->string('uom', 20)->default('UNIT');
            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('amount', 15, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['sale_return_id', 'sort_order']);
            $table->index('item_code');
        });

        Schema::create('sale_return_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained('sale_returns')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts');
            $table->string('refunded_to')->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('cash');
            $table->string('reference')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['sale_return_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_payments');
        Schema::dropIfExists('sale_return_lines');
        Schema::dropIfExists('sale_returns');
    }
};
