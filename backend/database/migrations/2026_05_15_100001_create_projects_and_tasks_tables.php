<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('owner_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])->default('planning');
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->timestamps();
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->foreignId('parent_task_id')->nullable()->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['pending', 'in_progress', 'review', 'completed', 'cancelled'])->default('pending');
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->enum('recurrence', ['none', 'daily', 'weekly', 'monthly'])->default('none');
            $table->enum('source', ['manual', 'ai_generated', 'recurring'])->default('manual');
            $table->unsignedBigInteger('source_jd_id')->nullable();
            $table->timestamps();
            $table->index(['assigned_to', 'status']);
            $table->index(['due_date', 'status']);
        });

        Schema::create('task_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('label');
            $table->boolean('is_done')->default(false);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });

        Schema::create('task_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('file_path');
            $table->string('file_type', 50)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        Schema::create('task_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('task_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('approver_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('remarks')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_approvals');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('task_attachments');
        Schema::dropIfExists('task_checklist_items');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('projects');
    }
};
