<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_types', function (Blueprint $table) {
            $table->id();
            $table->string('key', 60)->unique();          // stable internal id (e.g. "apparel")
            $table->string('label', 120);                  // display name
            $table->string('emoji', 8)->nullable();        // optional emoji
            $table->string('description', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_system')->default(false);  // built-in types — cannot be deleted
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed the system-defined types that are referenced by validation across the codebase.
        $now = now();
        DB::table('product_types')->insert([
            ['key' => 'apparel',      'label' => 'Apparel (Finished Good)', 'emoji' => '👗', 'description' => 'Ready-to-sell finished products',  'sort_order' => 1, 'is_system' => true, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'fabric',       'label' => 'Fabric (per meter)',      'emoji' => '🧵', 'description' => 'Raw fabric stock — sold per meter','sort_order' => 2, 'is_system' => true, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'accessory',    'label' => 'Accessory',               'emoji' => '👜', 'description' => 'Brooches, buttons, trims etc.',    'sort_order' => 3, 'is_system' => true, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'service',      'label' => 'Service',                 'emoji' => '🛠️', 'description' => 'Stitching, alterations, hosting',  'sort_order' => 4, 'is_system' => true, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'raw_material', 'label' => 'Raw Material',            'emoji' => '📦', 'description' => 'Threads, lining, packaging',       'sort_order' => 5, 'is_system' => true, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('product_types');
    }
};
