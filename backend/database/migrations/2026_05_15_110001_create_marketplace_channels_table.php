<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marketplace_channels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->string('region', 8)->nullable();
            $table->string('color', 20)->nullable();
            $table->json('credentials')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_connected')->default(false);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_channels');
    }
};
