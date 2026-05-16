<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('purchase_invoice_lines', function (Blueprint $table) {
            $table->string('item_code')->nullable()->after('account_id');
            $table->string('color')->nullable()->after('description');
            $table->string('size')->nullable()->after('color');
            $table->decimal('qty', 15, 3)->default(1)->after('size');
            $table->decimal('roll_count', 15, 3)->default(0)->after('qty');     // "Roll" in fabric trade
            $table->string('uom', 20)->default('UNIT')->after('roll_count');
            $table->decimal('unit_cost', 15, 4)->default(0)->after('uom');
            $table->decimal('discount', 15, 2)->default(0)->after('unit_cost');
        });

        // account_id was NOT NULL — make it nullable so fabric items don't need a manual GL account
        DB::statement('ALTER TABLE purchase_invoice_lines ALTER COLUMN account_id DROP NOT NULL');
    }

    public function down(): void
    {
        Schema::table('purchase_invoice_lines', function (Blueprint $table) {
            $table->dropColumn(['item_code', 'color', 'size', 'qty', 'roll_count', 'uom', 'unit_cost', 'discount']);
        });
        DB::statement('ALTER TABLE purchase_invoice_lines ALTER COLUMN account_id SET NOT NULL');
    }
};
