<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->string('item_code', 64)->nullable()->after('product_id');
            $table->string('description', 255)->nullable()->after('item_code');
            $table->string('color', 64)->nullable()->after('description');
            $table->string('size', 32)->nullable()->after('color');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->dropColumn(['item_code', 'description', 'color', 'size']);
        });
    }
};
