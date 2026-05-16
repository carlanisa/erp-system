<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bom_headers', function (Blueprint $table) {
            $table->id();
            $table->string('bom_number')->unique();                       // BOM-00001
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->decimal('output_qty', 14, 3)->default(1);             // produces this many products per recipe
            $table->string('output_uom')->default('PCS');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::create('bom_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bom_id')->constrained('bom_headers')->cascadeOnDelete();
            $table->foreignId('stock_item_id')->constrained()->cascadeOnDelete();
            $table->decimal('qty', 14, 3);
            $table->string('uom')->nullable();
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreign('default_bom_id')->references('id')->on('bom_headers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['default_bom_id']);
        });
        Schema::dropIfExists('bom_lines');
        Schema::dropIfExists('bom_headers');
    }
};
