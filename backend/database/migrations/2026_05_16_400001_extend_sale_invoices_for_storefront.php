<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sale_invoices', function (Blueprint $table) {
            $table->string('storefront_status', 30)->nullable()->after('status'); // pending_payment | paid | fulfilled | delivered | cancelled
            $table->string('payment_reference')->nullable()->after('payment_method');
            $table->unsignedBigInteger('shipping_zone_id')->nullable()->after('payment_reference');
            $table->unsignedBigInteger('coupon_id')->nullable()->after('shipping_zone_id');
            $table->string('coupon_code')->nullable()->after('coupon_id');
            $table->decimal('shipping_total', 15, 2)->default(0)->after('coupon_code');
            $table->json('shipping_address_json')->nullable()->after('shipping_total');
            $table->json('billing_address_json')->nullable()->after('shipping_address_json');
            $table->index(['source', 'storefront_status']);
        });

        // created_by points at users; storefront orders are placed by customers
        Schema::table('sale_invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->unsignedBigInteger('customer_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sale_invoices', function (Blueprint $table) {
            $table->dropColumn([
                'storefront_status', 'payment_reference', 'shipping_zone_id',
                'coupon_id', 'coupon_code', 'shipping_total',
                'shipping_address_json', 'billing_address_json',
            ]);
        });
    }
};
