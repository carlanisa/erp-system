<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('driver', 30);
            $table->string('label');
            $table->boolean('enabled')->default(true);
            $table->json('config')->nullable();
            $table->integer('sort_order')->default(0);
            $table->decimal('min_amount', 10, 2)->nullable();
            $table->decimal('max_amount', 10, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('storefront_payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->string('driver', 30);
            $table->string('intent_id')->nullable();
            $table->string('status', 30)->default('pending');
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('MYR');
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['order_id', 'driver']);
            $table->index('intent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_payment_transactions');
        Schema::dropIfExists('storefront_payment_methods');
    }
};
