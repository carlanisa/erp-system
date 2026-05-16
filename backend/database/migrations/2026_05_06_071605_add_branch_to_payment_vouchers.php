<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('payment_vouchers', function (Blueprint $table) {
            $table->string('branch_code')->default('HQ')->after('pv_number');
            $table->boolean('is_cancelled')->default(false)->after('status');
        });
        Schema::table('official_receipts', function (Blueprint $table) {
            $table->string('branch_code')->default('HQ')->after('or_number');
            $table->boolean('is_cancelled')->default(false)->after('status');
        });
    }
    public function down(): void {
        Schema::table('payment_vouchers', function (Blueprint $table) {
            $table->dropColumn(['branch_code','is_cancelled']);
        });
        Schema::table('official_receipts', function (Blueprint $table) {
            $table->dropColumn(['branch_code','is_cancelled']);
        });
    }
};
