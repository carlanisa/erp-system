<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_variant_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_location_id')->constrained();
            $table->decimal('qty', 15, 3)->default(0);
            $table->timestamps();
            $table->unique(['product_variant_id', 'stock_location_id'], 'pvl_unique');
        });

        Schema::create('product_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_location_id')->constrained();
            $table->decimal('qty', 15, 3)->default(0);
            $table->timestamps();
            $table->unique(['product_id', 'stock_location_id'], 'pl_unique');
        });

        // ── Seed 4 default branches (idempotent) ─────────────────────
        $now = now();
        $defaults = [
            ['code' => 'HQ',       'name' => 'HQ',         'type' => 'store'],
            ['code' => 'SHAHALAM', 'name' => 'Shah Alam',  'type' => 'store'],
            ['code' => 'KL',       'name' => 'KL',         'type' => 'store'],
            ['code' => 'BANGI',    'name' => 'Bangi',      'type' => 'store'],
        ];
        $ids = [];
        foreach ($defaults as $loc) {
            $existing = DB::table('stock_locations')->where('code', $loc['code'])->first();
            if ($existing) {
                $ids[$loc['code']] = $existing->id;
            } else {
                $ids[$loc['code']] = DB::table('stock_locations')->insertGetId([
                    'code'       => $loc['code'],
                    'name'       => $loc['name'],
                    'type'       => $loc['type'],
                    'is_active'  => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
        $hqId = $ids['HQ'];

        // ── Backfill: all existing stock parks at HQ ──────────────────
        foreach (DB::table('product_variants')->get(['id', 'stock']) as $v) {
            DB::table('product_variant_locations')->insert([
                'product_variant_id' => $v->id,
                'stock_location_id'  => $hqId,
                'qty'                => $v->stock,
                'created_at'         => $now,
                'updated_at'         => $now,
            ]);
        }
        foreach (DB::table('products')->get(['id', 'stock']) as $p) {
            DB::table('product_locations')->insert([
                'product_id'        => $p->id,
                'stock_location_id' => $hqId,
                'qty'               => $p->stock,
                'created_at'        => $now,
                'updated_at'        => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_locations');
        Schema::dropIfExists('product_locations');
        // Leave the seeded stock_locations rows (user data)
    }
};
