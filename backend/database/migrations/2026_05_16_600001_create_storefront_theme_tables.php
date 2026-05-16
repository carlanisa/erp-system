<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Single-row key/value config — colors, logo, fonts, brand text, social, contact.
        Schema::create('storefront_theme_settings', function (Blueprint $table) {
            $table->id();
            $table->string('preset', 30)->default('elegant');         // elegant | bold | minimal | pastel
            // Colors (CSS values — hex / rgb / oklch)
            $table->string('color_primary', 30)->default('#7f1d1d');   // brand
            $table->string('color_accent', 30)->default('#b8860b');    // gold/amber
            $table->string('color_bg', 30)->default('#faf7f2');        // page background
            $table->string('color_surface', 30)->default('#ffffff');   // card bg
            $table->string('color_text', 30)->default('#2b1d14');      // body
            $table->string('color_muted', 30)->default('#6b5d4f');     // muted text
            $table->string('color_sale', 30)->default('#dc2626');      // sale badge
            // Typography
            $table->string('font_heading', 60)->default('Playfair Display');
            $table->string('font_body', 60)->default('Inter');
            // Brand
            $table->string('brand_name')->default('Modestwear');
            $table->string('brand_tagline')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('favicon_url')->nullable();
            // Contact
            $table->string('contact_phone')->nullable();
            $table->string('contact_whatsapp')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_address')->nullable();
            // Social
            $table->string('social_instagram')->nullable();
            $table->string('social_facebook')->nullable();
            $table->string('social_tiktok')->nullable();
            $table->string('social_youtube')->nullable();
            // Misc
            $table->boolean('newsletter_popup_enabled')->default(false);
            $table->string('currency_display', 8)->default('RM');
            $table->json('extra_json')->nullable();
            $table->timestamps();
        });

        // Top announcement bar (e.g. "20% Off All Clothing. Limited time offer!")
        Schema::create('storefront_announcement_bars', function (Blueprint $table) {
            $table->id();
            $table->string('text');
            $table->string('link_url')->nullable();
            $table->string('bg_color', 30)->default('#7f1d1d');
            $table->string('text_color', 30)->default('#ffffff');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Homepage sections — admin orders and configures these
        Schema::create('storefront_sections', function (Blueprint $table) {
            $table->id();
            // hero_slider | categories_grid | featured_products | banner_strip |
            // image_text | lookbook | testimonials | newsletter | instagram |
            // faq | countdown | rich_text
            $table->string('type', 30);
            $table->string('label')->nullable();
            $table->integer('position')->default(0);
            $table->boolean('enabled')->default(true);
            $table->json('config_json')->nullable();
            $table->timestamps();
            $table->index(['enabled', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_sections');
        Schema::dropIfExists('storefront_announcement_bars');
        Schema::dropIfExists('storefront_theme_settings');
    }
};
