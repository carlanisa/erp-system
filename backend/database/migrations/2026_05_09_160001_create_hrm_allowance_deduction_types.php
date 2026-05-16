<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrm_allowance_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            // 'fixed' = flat RM amount, 'percent' = % of basic salary
            $table->enum('calc_type', ['fixed', 'percent'])->default('fixed');
            $table->decimal('default_amount', 12, 2)->default(0);   // used when calc_type=fixed
            $table->decimal('default_percent', 6, 3)->default(0);   // used when calc_type=percent (e.g. 10.000 = 10%)
            $table->boolean('is_taxable')->default(true);           // counted in PCB / income tax base
            $table->boolean('is_epf_eligible')->default(false);     // included in EPF calc base
            $table->string('color', 20)->default('emerald');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_deduction_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            // 'fixed' = flat RM, 'percent' = % of basic, 'statutory' = computed by formula (EPF/SOCSO/EIS/PCB)
            $table->enum('calc_type', ['fixed', 'percent', 'statutory'])->default('fixed');
            $table->decimal('default_amount', 12, 2)->default(0);
            $table->decimal('default_percent', 6, 3)->default(0);
            $table->boolean('is_statutory')->default(false);        // EPF/SOCSO/EIS/PCB
            $table->string('color', 20)->default('rose');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_deduction_types');
        Schema::dropIfExists('hrm_allowance_types');
    }
};
