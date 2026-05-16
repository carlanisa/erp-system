<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->foreignId('parent_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->index('parent_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_categories');
    }
};
