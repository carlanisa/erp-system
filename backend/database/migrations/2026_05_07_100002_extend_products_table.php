<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('category')->constrained('stock_departments')->nullOnDelete();
            $table->string('uom')->default('PCS')->after('category');
            $table->string('barcode')->nullable()->after('sku');
            $table->string('image_path')->nullable()->after('description');
            $table->foreignId('default_bom_id')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropColumn(['uom', 'barcode', 'image_path', 'default_bom_id']);
        });
    }
};
