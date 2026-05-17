<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();
            $table->timestamps();
        });

        // Seed the folders that the storefront editor already writes into so they
        // appear in the sidebar from day one, even if no images have been uploaded
        // to them yet.
        $defaults = ['uploads', 'theme', 'hero', 'categories', 'image-text', 'instagram', 'products', 'bundles', 'collections', 'banners'];
        foreach ($defaults as $name) {
            DB::table('media_folders')->insertOrIgnore([
                'name' => $name, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
    public function down(): void { Schema::dropIfExists('media_folders'); }
};
