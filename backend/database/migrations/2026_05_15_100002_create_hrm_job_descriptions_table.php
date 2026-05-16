<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrm_job_descriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('designation_id')->nullable()->constrained('hrm_designations')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->json('responsibilities')->nullable();
            $table->json('kpis')->nullable();
            $table->boolean('ai_generated')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrm_job_descriptions');
    }
};
