<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('pi_number')->unique();                 // PI-00001 (our internal #)
            $table->string('supplier_invoice_no')->nullable();     // supplier's own bill number
            $table->string('branch_code', 20)->default('HQ');
            $table->date('date');
            $table->date('due_date')->nullable();
            $table->date('posting_date')->nullable();
            $table->date('payment_date')->nullable();
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->foreignId('account_id')->nullable()->constrained('accounts');
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts');
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('bank_charges', 15, 2)->default(0);
            $table->string('payment_method')->default('bank_transfer');
            $table->string('cheque_number')->nullable();
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->string('agent')->nullable();
            $table->string('area')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('is_cancelled')->default(false);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('purchase_invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts');
            $table->string('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['purchase_invoice_id', 'sort_order']);
        });

        Schema::create('purchase_invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained('purchase_invoices')->cascadeOnDelete();
            $table->string('paid_to')->nullable();                 // supplier name snapshot for reconciliation
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['purchase_invoice_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_payments');
        Schema::dropIfExists('purchase_invoice_lines');
        Schema::dropIfExists('purchase_invoices');
    }
};
