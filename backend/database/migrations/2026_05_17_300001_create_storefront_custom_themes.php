<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('storefront_custom_themes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->json('settings_json');          // theme settings snapshot
            $table->json('sections_json');          // ordered sections snapshot
            $table->json('bar_json')->nullable();   // first active bar snapshot
            $table->string('preview_color', 30)->nullable(); // small swatch hint
            $table->foreignId('saved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('storefront_custom_themes'); }
};
