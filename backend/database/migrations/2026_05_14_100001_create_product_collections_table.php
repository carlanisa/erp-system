<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── 1. Collections master table ──────────────────────────
        Schema::create('product_collections', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ── 2. Add collection_id FK to products ──────────────────
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('collection_id')
                  ->nullable()
                  ->after('department_id')
                  ->constrained('product_collections')
                  ->nullOnDelete();
        });

        // ── 3. Inventory settings key-value store ─────────────────
        Schema::create('inventory_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group', 50)->default('general'); // seo | marketing | promotion
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('collection_id');
        });
        Schema::dropIfExists('product_collections');
        Schema::dropIfExists('inventory_settings');
    }
};
