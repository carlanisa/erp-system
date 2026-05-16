<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // [{ sku, name, qty_per_piece, uom }] — fabrics consumed to make ONE finished piece.
            $table->json('fabrics_used')->nullable()->after('material');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('fabrics_used');
        });
    }
};
