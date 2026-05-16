<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->date('date');
            $table->string('description');
            $table->string('reference')->nullable();
            $table->enum('status', ['draft', 'posted'])->default('draft');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained();
            $table->enum('type', ['debit', 'credit']);
            $table->decimal('amount', 15, 2);
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
    }
};
