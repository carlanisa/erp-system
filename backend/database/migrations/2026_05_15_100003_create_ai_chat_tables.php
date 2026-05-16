<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('language', 40)->nullable();
            $table->string('title')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'task_id']);
        });

        Schema::create('ai_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('ai_chat_conversations')->cascadeOnDelete();
            $table->enum('role', ['user', 'assistant', 'system']);
            $table->longText('content');
            $table->unsignedInteger('tokens_in')->default(0);
            $table->unsignedInteger('tokens_out')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_chat_messages');
        Schema::dropIfExists('ai_chat_conversations');
    }
};
