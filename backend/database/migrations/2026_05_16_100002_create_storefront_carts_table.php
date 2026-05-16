<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('session_token', 64)->unique();
            $table->string('currency', 3)->default('MYR');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('shipping_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->unsignedBigInteger('coupon_id')->nullable();
            $table->string('coupon_code')->nullable();
            $table->unsignedBigInteger('shipping_zone_id')->nullable();
            $table->string('status')->default('active'); // active|abandoned|converted
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['customer_id', 'status']);
        });

        Schema::create('storefront_cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained('storefront_carts')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('variant_id')->nullable()->constrained('product_variants');
            $table->string('item_code')->nullable();
            $table->string('name');
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->decimal('qty', 15, 3)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->json('options_json')->nullable();
            $table->timestamps();
            $table->index('cart_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_cart_items');
        Schema::dropIfExists('storefront_carts');
    }
};
