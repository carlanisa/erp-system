<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shopify_import_settings', function (Blueprint $table) {
            $table->id();
            $table->string('shop_domain', 120)->nullable();        // mystore.myshopify.com OR carlanisa.com
            $table->string('access_token', 255)->nullable();       // Admin API access token (shpat_…)
            $table->string('match_strategy', 30)->default('sku');  // sku | handle | name
            $table->boolean('only_missing_images')->default(true); // skip products that already have a featured image
            $table->timestamp('last_synced_at')->nullable();
            $table->unsignedBigInteger('last_shopify_count')->default(0);
            $table->unsignedBigInteger('last_imported_count')->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('shopify_import_settings'); }
};
