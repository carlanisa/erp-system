<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('official_receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('official_receipt_id')
                  ->constrained('official_receipts')
                  ->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts');
            $table->string('description')->nullable();
            $table->decimal('amount', 15, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['official_receipt_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('official_receipt_lines');
    }
};
