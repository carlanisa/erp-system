<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_bundles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            // sum_minus_percent: sum of items minus N%
            // fixed_total: fixed bundle price
            // free_cheapest: cheapest item free
            $table->enum('pricing_type', ['sum_minus_percent', 'fixed_total', 'free_cheapest']);
            $table->decimal('discount_value', 10, 2)->default(0); // percent or fixed total
            $table->integer('min_items')->default(2);
            $table->boolean('active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->json('channels')->nullable(); // restrict to web etc.
            $table->timestamps();
            $table->index(['active', 'sort_order']);
        });

        Schema::create('storefront_bundle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bundle_id')->constrained('storefront_bundles')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            // role:
            //   anchor   = the main item (e.g. baju kurung)
            //   required = must be present in the bundle
            //   suggested= shown as a swap option but not required (any item in this category)
            $table->enum('role', ['anchor', 'required', 'suggested'])->default('required');
            $table->integer('default_qty')->default(1);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index('bundle_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_bundle_items');
        Schema::dropIfExists('storefront_bundles');
    }
};
