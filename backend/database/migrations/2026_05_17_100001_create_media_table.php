<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('filename', 200)->unique();         // baju-kurung-red-2.jpg (slugified, no random hash)
            $table->string('original_name', 255);              // Baju Kurung Red.JPG
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');                // bytes
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('alt_text', 255)->nullable();       // human-readable, auto-filled from filename
            $table->string('folder', 60)->default('uploads');  // optional grouping (products / banners / theme)
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['folder', 'created_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('media'); }
};
