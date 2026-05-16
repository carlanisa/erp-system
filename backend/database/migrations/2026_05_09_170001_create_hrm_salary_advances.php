<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrm_salary_advances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('advance_date');
            $table->decimal('amount', 12, 2);
            $table->integer('installments')->default(1);          // months to recover
            $table->decimal('monthly_deduction', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('status', ['active', 'settled', 'cancelled'])->default('active');
            $table->string('reason', 200)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_salary_advances');
    }
};
