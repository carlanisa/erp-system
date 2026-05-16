<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tailor_order_lines', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('stock_item_id')->constrained('accounts')->nullOnDelete();
            $table->string('item_code')->nullable()->after('account_id');
            $table->string('description')->nullable()->after('item_code');
            $table->string('color')->nullable()->after('description');
            $table->string('size')->nullable()->after('color');
            $table->decimal('roll_count', 14, 3)->nullable()->after('size');
            $table->decimal('discount', 15, 2)->default(0)->after('unit_cost');
        });

        // also extend bom_lines so BOMs can carry the same fabric metadata that gets snapshotted into orders
        Schema::table('bom_lines', function (Blueprint $table) {
            if (!Schema::hasColumn('bom_lines', 'account_id')) {
                $table->foreignId('account_id')->nullable()->after('stock_item_id')->constrained('accounts')->nullOnDelete();
            }
            if (!Schema::hasColumn('bom_lines', 'item_code'))   $table->string('item_code')->nullable()->after('service_name');
            if (!Schema::hasColumn('bom_lines', 'description')) $table->string('description')->nullable()->after('item_code');
            if (!Schema::hasColumn('bom_lines', 'color'))       $table->string('color')->nullable()->after('description');
            if (!Schema::hasColumn('bom_lines', 'size'))        $table->string('size')->nullable()->after('color');
            if (!Schema::hasColumn('bom_lines', 'roll_count'))  $table->decimal('roll_count', 14, 3)->nullable()->after('size');
            if (!Schema::hasColumn('bom_lines', 'discount'))    $table->decimal('discount', 15, 2)->default(0)->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('tailor_order_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
            $table->dropColumn(['item_code','description','color','size','roll_count','discount']);
        });
        Schema::table('bom_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
            $table->dropColumn(['item_code','description','color','size','roll_count','discount']);
        });
    }
};
