<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Menu = a group of links rendered in a specific location (header, footer columns)
        Schema::create('storefront_menus', function (Blueprint $table) {
            $table->id();
            $table->string('location', 30)->unique(); // header | footer_shop | footer_help | footer_company
            $table->string('label', 80);              // label shown in admin only
            $table->timestamps();
        });

        Schema::create('storefront_menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained('storefront_menus')->cascadeOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable(); // self-ref (for sub-menus / mega menu)
            $table->string('label', 120);
            // link types: page | product | category | custom
            $table->string('link_type', 20)->default('custom');
            $table->string('link_value', 500)->nullable();        // page slug, product id, custom url
            $table->boolean('open_in_new_tab')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['menu_id', 'parent_id', 'sort_order']);
        });

        // SEO / open-graph image for pages
        Schema::table('storefront_pages', function (Blueprint $table) {
            $table->string('og_image_url')->nullable()->after('meta_description');
            $table->string('language', 8)->default('en')->after('og_image_url');
            $table->index('language');
        });

        // Page views for analytics
        Schema::create('storefront_page_views', function (Blueprint $table) {
            $table->id();
            $table->string('page_slug', 80)->index();
            $table->foreignId('page_id')->nullable()->constrained('storefront_pages')->nullOnDelete();
            $table->string('session_token', 64)->nullable()->index();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('referrer', 500)->nullable();
            $table->string('utm_source', 60)->nullable();
            $table->string('utm_medium', 60)->nullable();
            $table->string('utm_campaign', 80)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('country', 2)->nullable();
            $table->timestamp('viewed_at')->useCurrent()->index();
        });

        // Enabled languages on the storefront (theme-level)
        Schema::table('storefront_theme_settings', function (Blueprint $table) {
            $table->json('enabled_languages')->nullable()->after('extra_json');
            $table->string('default_language', 8)->default('en')->after('enabled_languages');
        });

        // Seed default header + footer menus
        $now = now();
        $menus = [
            ['location' => 'header',         'label' => 'Header menu'],
            ['location' => 'footer_shop',    'label' => 'Footer · Shop'],
            ['location' => 'footer_help',    'label' => 'Footer · Help'],
            ['location' => 'footer_company', 'label' => 'Footer · Company'],
        ];
        foreach ($menus as $m) DB::table('storefront_menus')->insert(array_merge($m, ['created_at' => $now, 'updated_at' => $now]));

        // Sample header items
        $headerId = DB::table('storefront_menus')->where('location', 'header')->value('id');
        $items = [
            ['label' => 'Shop', 'link_type' => 'custom', 'link_value' => '/shop', 'sort_order' => 1],
            ['label' => 'Baju Kurung', 'link_type' => 'custom', 'link_value' => '/shop/baju-kurung', 'sort_order' => 2],
            ['label' => 'Hijab', 'link_type' => 'custom', 'link_value' => '/shop/hijab', 'sort_order' => 3],
            ['label' => 'New Arrivals', 'link_type' => 'custom', 'link_value' => '/shop/new-arrivals', 'sort_order' => 4],
        ];
        foreach ($items as $it) {
            DB::table('storefront_menu_items')->insert(array_merge($it, [
                'menu_id' => $headerId, 'created_at' => $now, 'updated_at' => $now,
            ]));
        }
    }

    public function down(): void
    {
        Schema::table('storefront_theme_settings', function (Blueprint $table) {
            $table->dropColumn(['enabled_languages', 'default_language']);
        });
        Schema::dropIfExists('storefront_page_views');
        Schema::table('storefront_pages', function (Blueprint $table) {
            $table->dropColumn(['og_image_url', 'language']);
        });
        Schema::dropIfExists('storefront_menu_items');
        Schema::dropIfExists('storefront_menus');
    }
};
