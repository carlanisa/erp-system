<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code')->unique();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('cnic')->nullable();
            $table->string('department');
            $table->string('designation');
            $table->date('join_date');
            $table->decimal('basic_salary', 15, 2)->default(0);
            $table->text('address')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->enum('status', ['present', 'absent', 'half_day', 'on_leave'])->default('present');
            $table->text('notes')->nullable();
            $table->unique(['employee_id', 'date']);
            $table->timestamps();
        });

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->string('type')->default('annual');
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained();
            $table->integer('month');
            $table->integer('year');
            $table->decimal('basic_salary',   15, 2);
            $table->decimal('allowances',     15, 2)->default(0);
            $table->decimal('deductions',     15, 2)->default(0);
            $table->decimal('net_salary',     15, 2);
            $table->enum('status', ['draft', 'paid'])->default('draft');
            $table->date('paid_date')->nullable();
            $table->unique(['employee_id', 'month', 'year']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('employees');
    }
};
