<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->string('source', 20)->default('erp')->after('status'); // erp | storefront
            $table->string('storefront_status', 30)->nullable()->after('source'); // pending_payment | paid | fulfilled | cancelled | refunded
            $table->string('payment_method', 30)->nullable()->after('storefront_status');
            $table->string('payment_reference')->nullable()->after('payment_method');
            $table->unsignedBigInteger('shipping_zone_id')->nullable()->after('payment_reference');
            $table->unsignedBigInteger('coupon_id')->nullable()->after('shipping_zone_id');
            $table->decimal('shipping_total', 15, 2)->default(0)->after('coupon_id');
            $table->json('shipping_address_json')->nullable()->after('shipping_total');
            $table->json('billing_address_json')->nullable()->after('shipping_address_json');
            $table->string('coupon_code')->nullable()->after('billing_address_json');
            $table->index(['source', 'storefront_status']);
        });

        // created_by is constrained to users; storefront orders are placed by customers,
        // so we make it nullable here.
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->unsignedBigInteger('customer_id_storefront')->nullable()->after('customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropColumn([
                'source', 'storefront_status', 'payment_method', 'payment_reference',
                'shipping_zone_id', 'coupon_id', 'shipping_total',
                'shipping_address_json', 'billing_address_json', 'coupon_code',
                'customer_id_storefront',
            ]);
        });
    }
};
