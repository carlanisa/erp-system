<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('storefront_payment_transactions', function (Blueprint $table) {
            // Drop the old FK (named by Laravel convention)
            try { $table->dropForeign(['order_id']); } catch (\Throwable $e) {}
        });

        // Repoint to sale_invoices (storefront orders now live there as source='online')
        Schema::table('storefront_payment_transactions', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('sale_invoices')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('storefront_payment_transactions', function (Blueprint $table) {
            try { $table->dropForeign(['order_id']); } catch (\Throwable $e) {}
            $table->foreign('order_id')->references('id')->on('sales_orders')->cascadeOnDelete();
        });
    }
};
