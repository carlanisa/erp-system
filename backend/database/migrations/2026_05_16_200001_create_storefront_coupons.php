<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 60)->unique();
            $table->string('description')->nullable();
            $table->enum('type', ['percent', 'fixed', 'free_shipping']);
            $table->decimal('value', 10, 2)->default(0);
            $table->decimal('min_subtotal', 10, 2)->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('per_customer_limit')->nullable();
            $table->enum('applies_to', ['all', 'category', 'product'])->default('all');
            $table->json('target_ids')->nullable();
            $table->boolean('stackable')->default(false);
            $table->boolean('active')->default(true);
            $table->integer('redeem_count')->default(0);
            $table->timestamps();
            $table->index(['active', 'starts_at', 'ends_at']);
        });

        Schema::create('storefront_coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained('storefront_coupons')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->decimal('amount_discounted', 10, 2)->default(0);
            $table->timestamp('redeemed_at')->useCurrent();
            $table->index(['coupon_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_coupon_redemptions');
        Schema::dropIfExists('storefront_coupons');
    }
};
