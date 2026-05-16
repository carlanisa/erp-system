<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // make stock_item_id nullable so service/overhead lines don't need one
        Schema::table('bom_lines', function (Blueprint $table) {
            $table->dropForeign(['stock_item_id']);
        });
        DB::statement('ALTER TABLE bom_lines ALTER COLUMN stock_item_id DROP NOT NULL');
        Schema::table('bom_lines', function (Blueprint $table) {
            $table->foreign('stock_item_id')->references('id')->on('stock_items')->cascadeOnDelete();

            $table->string('kind', 20)->default('material')->after('bom_id');     // material | tailor_service | overhead
            $table->string('service_name')->nullable()->after('kind');           // e.g. "Stitching", "Packing"
            $table->decimal('unit_cost', 15, 2)->default(0)->after('uom');       // for service/overhead lines (per unit of output)
        });
    }

    public function down(): void
    {
        Schema::table('bom_lines', function (Blueprint $table) {
            $table->dropColumn(['kind','service_name','unit_cost']);
        });
        // not restoring NOT NULL on stock_item_id (could break existing rows)
    }
};
