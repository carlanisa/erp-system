<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name')->default('My Company');
            $table->string('legal_name')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('reg_number')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('postcode')->nullable();
            $table->string('country')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('logo_path')->nullable();
            $table->jsonb('accounting')->nullable();
            $table->jsonb('system')->nullable();
            $table->jsonb('notifications')->nullable();
            $table->jsonb('security')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
