<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_shipping_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 8)->unique();   // WM, EM, INTL
            $table->json('state_codes')->nullable(); // array of MY-XX codes
            $table->boolean('enabled')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('storefront_shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained('storefront_shipping_zones')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('flat_rate', 10, 2)->default(0);
            $table->decimal('free_over', 10, 2)->nullable(); // subtotal threshold for free shipping
            $table->decimal('weight_min', 10, 3)->nullable();
            $table->decimal('weight_max', 10, 3)->nullable();
            $table->boolean('enabled')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index('zone_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_shipping_rates');
        Schema::dropIfExists('storefront_shipping_zones');
    }
};
