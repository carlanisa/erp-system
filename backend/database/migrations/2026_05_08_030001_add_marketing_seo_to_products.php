<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // ── Identity (Google Merchant Center / Meta Catalog) ──
            $table->string('gtin', 20)->nullable()->after('barcode');                          // EAN-13 / UPC / GTIN
            $table->string('mpn',  60)->nullable()->after('gtin');                             // manufacturer part #
            $table->string('google_product_category')->nullable()->after('mpn');               // Google Taxonomy
            $table->string('fb_product_category')->nullable()->after('google_product_category');

            // ── Product attributes (required by Google Shopping / Meta) ──
            $table->string('condition', 20)->default('new')->after('fb_product_category');     // new | refurbished | used
            $table->string('gender', 20)->nullable()->after('condition');                      // female | male | unisex
            $table->string('age_group', 20)->nullable()->after('gender');                      // adult | kids | teen | toddler | newborn
            $table->string('material', 100)->nullable()->after('age_group');                   // Cotton, Polyester
            $table->string('pattern',  100)->nullable()->after('material');                    // Plain, Floral, Stripe
            $table->string('color',    100)->nullable()->after('pattern');                     // primary base color (variants override)
            $table->string('size_type', 30)->nullable()->after('color');                       // regular | petite | plus | tall

            // ── Media (multi-image + video for marketplaces) ──
            $table->string('featured_image_url')->nullable()->after('image_path');
            $table->json('gallery_urls')->nullable()->after('featured_image_url');             // ["url1","url2",...]
            $table->string('og_image_url')->nullable()->after('gallery_urls');                 // 1200x630 social
            $table->string('video_url')->nullable()->after('og_image_url');                    // YouTube / Vimeo embed

            // ── SEO additional ──
            $table->string('focus_keyword')->nullable()->after('seo_description');
            $table->json('secondary_keywords')->nullable()->after('focus_keyword');
            $table->string('canonical_url')->nullable()->after('secondary_keywords');
            $table->string('robots', 50)->default('index,follow')->after('canonical_url');     // index,follow | noindex,nofollow
            $table->string('twitter_card', 30)->default('summary_large_image')->after('robots');

            // ── Promotion ──
            $table->boolean('is_featured')->default(false)->after('twitter_card');
            $table->boolean('is_bestseller')->default(false)->after('is_featured');
            $table->boolean('is_new_arrival')->default(false)->after('is_bestseller');
            $table->dateTime('sale_starts_at')->nullable()->after('is_new_arrival');
            $table->dateTime('sale_ends_at')->nullable()->after('sale_starts_at');
            $table->date('launch_date')->nullable()->after('sale_ends_at');

            // ── Reviews aggregate (for Schema.org rich snippet) ──
            $table->decimal('avg_rating', 3, 2)->default(0)->after('launch_date');
            $table->integer('review_count')->default(0)->after('avg_rating');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'gtin','mpn','google_product_category','fb_product_category',
                'condition','gender','age_group','material','pattern','color','size_type',
                'featured_image_url','gallery_urls','og_image_url','video_url',
                'focus_keyword','secondary_keywords','canonical_url','robots','twitter_card',
                'is_featured','is_bestseller','is_new_arrival','sale_starts_at','sale_ends_at','launch_date',
                'avg_rating','review_count',
            ]);
        });
    }
};
