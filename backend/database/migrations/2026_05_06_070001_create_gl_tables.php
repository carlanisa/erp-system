<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Payment Vouchers (PV) — money going OUT
        Schema::create('payment_vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('pv_number')->unique();
            $table->date('date');
            $table->string('payee');                          // who we're paying
            $table->foreignId('account_id')->constrained();   // expense/asset account
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts'); // bank/cash account
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('cheque'); // cash/cheque/bank_transfer
            $table->string('cheque_number')->nullable();
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        // Official Receipts (OR) — money coming IN
        Schema::create('official_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('or_number')->unique();
            $table->date('date');
            $table->string('received_from');                  // customer / payer name
            $table->foreignId('account_id')->constrained();   // income/receivable account
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('cash');
            $table->string('cheque_number')->nullable();
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        // Bank Reconciliation
        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained();   // bank account
            $table->integer('month');
            $table->integer('year');
            $table->decimal('statement_balance', 15, 2)->default(0);  // from bank statement
            $table->decimal('book_balance', 15, 2)->default(0);       // from our books
            $table->decimal('adjusted_balance', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->enum('status', ['open', 'reconciled'])->default('open');
            $table->foreignId('created_by')->constrained('users');
            $table->unique(['account_id', 'month', 'year']);
            $table->timestamps();
        });

        // A/R Deposits — customer advances / deposits received
        Schema::create('ar_deposits', function (Blueprint $table) {
            $table->id();
            $table->string('deposit_number')->unique();
            $table->date('date');
            $table->foreignId('customer_id')->constrained();
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('bank_transfer');
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'applied', 'refunded'])->default('pending');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        // A/P Deposits — deposits paid to suppliers
        Schema::create('ap_deposits', function (Blueprint $table) {
            $table->id();
            $table->string('deposit_number')->unique();
            $table->date('date');
            $table->string('supplier_name');
            $table->foreignId('bank_account_id')->nullable()->constrained('accounts');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('bank_transfer');
            $table->string('reference')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'applied', 'refunded'])->default('pending');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ap_deposits');
        Schema::dropIfExists('ar_deposits');
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('official_receipts');
        Schema::dropIfExists('payment_vouchers');
    }
};
