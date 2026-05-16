<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('supplier_code')->unique()->nullable();    // e.g. SUP-0001
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->string('tax_number')->nullable();                  // GST / VAT / SST no
            $table->string('payment_terms')->nullable();               // e.g. Net 30
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
