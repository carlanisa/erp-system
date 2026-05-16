<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marketplace_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_order_id')->constrained('marketplace_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('external_sku', 120)->nullable();
            $table->string('external_variant_name')->nullable();
            $table->string('name_snapshot')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->integer('qty')->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->string('scanned_sku', 120)->nullable();
            $table->timestamp('picked_at')->nullable();
            $table->foreignId('picked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('external_sku');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_order_items');
    }
};
