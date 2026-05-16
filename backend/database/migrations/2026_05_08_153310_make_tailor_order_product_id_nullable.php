<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tailor_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->change();
        });
        if (Schema::hasTable('tailor_order_lines') && !Schema::hasColumn('tailor_order_lines', 'avg_per_piece')) {
            Schema::table('tailor_order_lines', function (Blueprint $table) {
                $table->decimal('avg_per_piece', 10, 3)->nullable()->after('discount');
            });
        }
    }

    public function down(): void
    {
        Schema::table('tailor_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable(false)->change();
        });
        if (Schema::hasTable('tailor_order_lines') && Schema::hasColumn('tailor_order_lines', 'avg_per_piece')) {
            Schema::table('tailor_order_lines', function (Blueprint $table) {
                $table->dropColumn('avg_per_piece');
            });
        }
    }
};
