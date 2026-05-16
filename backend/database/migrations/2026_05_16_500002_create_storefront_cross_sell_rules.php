<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_cross_sell_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('anchor_type', ['category', 'product']);
            $table->string('anchor_value');                  // category slug or product id
            // What to suggest. Categories searched first; specific products override.
            $table->json('suggest_categories')->nullable();
            $table->json('suggest_product_ids')->nullable();
            $table->string('reason_text')->nullable();       // "Pairs beautifully with this hijab"
            $table->integer('max_suggestions')->default(4);
            $table->integer('priority')->default(100);       // lower runs first
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index(['anchor_type', 'anchor_value', 'active']);
            $table->index(['active', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_cross_sell_rules');
    }
};
