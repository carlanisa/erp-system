<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('storefront_shipping_zones', function (Blueprint $table) {
            // ISO 3166-1 alpha-2 country code (MY, SG, US, ...) — null = legacy state-based MY zone
            $table->string('country_code', 2)->nullable()->after('code');

            // Optional courier integration per zone
            $table->string('courier', 30)->nullable()->after('country_code'); // dhl|fedex|pos_laju|easyparcel|...
            $table->json('courier_config')->nullable()->after('courier');     // {api_key:..., account:..., service:...}

            $table->index('country_code');
        });
    }

    public function down(): void
    {
        Schema::table('storefront_shipping_zones', function (Blueprint $table) {
            $table->dropColumn(['country_code', 'courier', 'courier_config']);
        });
    }
};
