<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrm_departments', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('manager')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_designations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->nullable()->constrained('hrm_departments')->nullOnDelete();
            $table->string('title');
            $table->string('grade')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['department_id', 'title']);
        });

        Schema::create('hrm_leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->integer('days_per_year')->default(0);
            $table->boolean('is_paid')->default(true);
            $table->boolean('carry_forward')->default(false);
            $table->string('color', 20)->default('blue');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrm_holidays', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('name');
            $table->enum('type', ['public', 'company', 'religious'])->default('public');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['date', 'name']);
        });

        Schema::create('hrm_shifts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('break_minutes')->default(0);
            $table->json('working_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('cnic')->constrained('hrm_departments')->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->after('department_id')->constrained('hrm_designations')->nullOnDelete();
            $table->foreignId('shift_id')->nullable()->after('designation_id')->constrained('hrm_shifts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropForeign(['designation_id']);
            $table->dropForeign(['shift_id']);
            $table->dropColumn(['department_id', 'designation_id', 'shift_id']);
        });

        Schema::dropIfExists('hrm_shifts');
        Schema::dropIfExists('hrm_holidays');
        Schema::dropIfExists('hrm_leave_types');
        Schema::dropIfExists('hrm_designations');
        Schema::dropIfExists('hrm_departments');
    }
};
