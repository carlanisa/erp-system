<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payment_voucher_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_voucher_id')
                  ->constrained('payment_vouchers')
                  ->cascadeOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();   // cheque no / bank txn ref
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['payment_voucher_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_voucher_payments');
    }
};
