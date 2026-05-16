<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->unique()->constrained('employees')->cascadeOnDelete();
            $table->string('preferred_language', 60)->nullable();
            $table->string('push_token')->nullable();
            $table->boolean('email_notifications')->default(true);
            $table->boolean('push_notifications')->default(true);
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('type', 60);
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('link')->nullable();
            $table->enum('channel', ['in_app', 'email', 'push'])->default('in_app');
            $table->timestamp('read_at')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('employee_preferences');
    }
};
