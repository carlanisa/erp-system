<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('sale_price', 15, 2)->default(0);
            $table->decimal('stock', 12, 3)->default(0);
            $table->decimal('low_stock_alert', 12, 3)->default(5);
            $table->enum('costing_method', ['fifo', 'lifo', 'average'])->default('average');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained();
            $table->enum('type', ['in', 'out', 'adjustment', 'transfer']);
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('products');
    }
};
