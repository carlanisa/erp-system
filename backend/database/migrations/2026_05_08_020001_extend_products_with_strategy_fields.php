<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // ── Identity / Strategy ──
            $table->string('name_bm')->nullable()->after('name');                          // Bahasa Malaysia
            $table->text('description_short')->nullable()->after('description');           // 1-line summary
            $table->string('product_type', 30)->default('apparel')->after('barcode');      // apparel | fabric | accessory | service
            $table->string('brand')->nullable()->after('product_type');
            $table->json('tags')->nullable()->after('brand');                              // ["Eid 2026","Festive","Bestseller"]
            $table->text('care_instructions')->nullable()->after('tags');

            // ── Pricing (default for products without variants; variants override) ──
            $table->decimal('original_price', 15, 2)->default(0)->after('sale_price');     // MSRP / "was" price for compare-at

            // ── Tax & Shipping ──
            $table->decimal('tax_rate', 5, 2)->default(6)->after('costing_method');        // SST 6% default
            $table->string('hs_code', 30)->nullable()->after('tax_rate');                  // customs code
            $table->string('country_of_origin', 60)->default('Malaysia')->after('hs_code');
            $table->decimal('weight_kg', 10, 3)->nullable()->after('country_of_origin');

            // ── SEO ──
            $table->string('seo_slug')->nullable()->after('weight_kg');
            $table->string('seo_title')->nullable()->after('seo_slug');
            $table->text('seo_description')->nullable()->after('seo_title');

            // ── Channels (multi-marketplace toggles) ──
            $table->json('channels')->nullable()->after('seo_description');                // ["pos","shopify","shopee_my","shopee_sg","tiktok_my","lazada"]

            // ── Status (replaces simple is_active boolean for richer states) ──
            $table->string('status', 20)->default('active')->after('channels');            // draft | active | archived
        });

        // ── Variant table ──
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('sku')->unique();                                               // auto-gen: BASE-COLOR-SIZE
            $table->string('barcode')->nullable()->unique();                               // EAN-13 / generated
            $table->string('color', 60)->nullable();
            $table->string('size', 30)->nullable();
            $table->string('variant_label')->nullable();                                   // free-form (e.g. "Mini", "Tall")

            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('sale_price', 15, 2)->default(0);
            $table->decimal('original_price', 15, 2)->default(0);                          // compare-at
            $table->decimal('wholesale_price', 15, 2)->default(0);

            $table->decimal('stock',          12, 3)->default(0);
            $table->decimal('reserved_stock', 12, 3)->default(0);                          // committed to orders, not yet shipped
            $table->decimal('reorder_level',  12, 3)->default(0);

            $table->decimal('weight_kg',      10, 3)->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['product_id','color','size']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'name_bm','description_short','product_type','brand','tags','care_instructions',
                'original_price','tax_rate','hs_code','country_of_origin','weight_kg',
                'seo_slug','seo_title','seo_description','channels','status',
            ]);
        });
    }
};
