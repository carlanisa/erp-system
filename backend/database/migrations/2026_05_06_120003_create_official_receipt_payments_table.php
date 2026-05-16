<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('official_receipt_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('official_receipt_id')
                  ->constrained('official_receipts')
                  ->cascadeOnDelete();
            $table->string('received_from')->nullable();              // who paid this installment
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['official_receipt_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('official_receipt_payments');
    }
};
