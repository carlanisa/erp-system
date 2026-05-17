<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Custom pages (in addition to the home page)
        Schema::create('storefront_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('title', 160);
            $table->string('meta_title', 160)->nullable();
            $table->string('meta_description', 255)->nullable();
            $table->boolean('is_home')->default(false);
            $table->boolean('is_published')->default(true);
            $table->integer('sort_order')->default(100);
            $table->timestamps();
        });

        // Re-usable section templates (e.g. "About us layout")
        Schema::create('storefront_section_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 160);
            $table->string('slug', 180)->unique();
            $table->text('description')->nullable();
            $table->json('blocks_json');             // ordered array of {type, label, config_json}
            $table->string('preview_color', 30)->nullable();
            $table->integer('block_count')->default(0);
            $table->foreignId('saved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Add page_id to sections so each section belongs to exactly one page
        Schema::table('storefront_sections', function (Blueprint $table) {
            $table->foreignId('page_id')->nullable()->after('id')->constrained('storefront_pages')->cascadeOnDelete();
            $table->index('page_id');
        });

        // Seed the default Home page row + backfill all existing sections to it
        $homeId = DB::table('storefront_pages')->insertGetId([
            'slug' => 'home',
            'title' => 'Home',
            'is_home' => true,
            'is_published' => true,
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('storefront_sections')->whereNull('page_id')->update(['page_id' => $homeId]);
    }

    public function down(): void
    {
        Schema::table('storefront_sections', function (Blueprint $table) {
            $table->dropForeign(['page_id']);
            $table->dropColumn('page_id');
        });
        Schema::dropIfExists('storefront_section_templates');
        Schema::dropIfExists('storefront_pages');
    }
};
