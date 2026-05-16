<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('password')->nullable()->after('email');
            $table->timestamp('email_verified_at')->nullable()->after('password');
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
            $table->string('remember_token', 100)->nullable()->after('phone_verified_at');
            $table->boolean('marketing_opt_in')->default(false)->after('remember_token');
            $table->string('default_state_code', 8)->nullable()->after('country');
            $table->index('email');
        });

        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('name');
            $table->string('phone');
            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('city');
            $table->string('state_code', 8); // MY-01..MY-16
            $table->string('postcode', 10);
            $table->string('country', 2)->default('MY');
            $table->boolean('is_default_shipping')->default(false);
            $table->boolean('is_default_billing')->default(false);
            $table->timestamps();
            $table->index(['customer_id', 'is_default_shipping']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['password', 'email_verified_at', 'phone_verified_at', 'remember_token', 'marketing_opt_in', 'default_state_code']);
        });
    }
};
