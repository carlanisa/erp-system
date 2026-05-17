<?php

namespace App\Services\Storefront;

/**
 * Static catalogue of complete "scenes" — each scene = theme settings
 * + full set of homepage sections + announcement bar. Applying a scene is
 * destructive: replaces ALL sections + bars + theme settings in one step.
 */
class SceneLibrary
{
    /** @return array<int, array{code:string,name:string,tag:string,description:string,sample:array<int,string>,settings:array,sections:array,bar:?array}> */
    public static function all(): array
    {
        return [
            self::carlanisa(),
            self::raya(),
            self::luxury(),
            self::modern(),
            self::bold(),
        ];
    }

    public static function byCode(string $code): ?array
    {
        foreach (self::all() as $s) if ($s['code'] === $code) return $s;
        return null;
    }

    // ──────────────────────────────────────────────────────────────
    // Scenes
    // ──────────────────────────────────────────────────────────────

    private static function carlanisa(): array
    {
        return [
            'code' => 'carlanisa',
            'name' => 'Carlanisa Modestwear',
            'tag'  => 'Default — luxe modestwear',
            'description' => 'Cream + maroon + gold. Hero slider, categories, featured products, story, testimonials, newsletter, Instagram. Same as your current site.',
            'sample' => ['#5d2a2a', '#b8860b', '#fdfaf5'],
            'settings' => [
                'preset' => 'carlanisa',
                'color_primary' => '#5d2a2a', 'color_accent' => '#b8860b',
                'color_bg' => '#fdfaf5', 'color_surface' => '#ffffff',
                'color_text' => '#2b1d14', 'color_muted' => '#6b5d4f', 'color_sale' => '#dc2626',
                'font_heading' => 'Playfair Display', 'font_body' => 'Inter',
            ],
            'bar' => ['text' => '20% Off All Clothing. Limited time offer!', 'bg_color' => '#5d2a2a', 'text_color' => '#ffffff'],
            'sections' => [
                ['type' => 'hero_slider', 'label' => 'Hero slider', 'config_json' => [
                    'autoplay' => true, 'interval' => 5500,
                    'slides' => [
                        ['image' => 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'New Arrival', 'headline' => 'Latest Collection 2026', 'subheading' => 'Modern Malaysian modestwear, handpicked for the season', 'button_text' => 'Shop Now', 'button_url' => '/shop', 'overlay' => 0.35, 'align' => 'left'],
                        ['image' => 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'Featured', 'headline' => 'Curated for the Modern Woman', 'subheading' => 'Premium fabrics, exquisite tailoring', 'button_text' => 'Discover', 'button_url' => '/shop', 'overlay' => 0.30, 'align' => 'center'],
                    ],
                ]],
                ['type' => 'categories_grid', 'label' => 'Shop by category', 'config_json' => [
                    'title' => 'Shop by Category', 'subtitle' => 'Discover our curated collections', 'columns' => 3,
                    'categories' => [
                        ['name' => 'Baju Kurung', 'image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/baju-kurung'],
                        ['name' => 'Hijab',       'image' => 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/hijab'],
                        ['name' => 'New Arrivals','image' => 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/new-arrivals'],
                    ],
                ]],
                ['type' => 'featured_products', 'label' => 'Featured products', 'config_json' => ['title' => 'Featured This Week', 'subtitle' => 'Our best-loved styles', 'limit' => 8]],
                ['type' => 'banner_strip', 'label' => 'Free shipping banner', 'config_json' => [
                    'items' => [
                        ['icon' => 'truck',  'title' => 'Free Shipping',   'subtitle' => 'On orders over RM150'],
                        ['icon' => 'gift',   'title' => 'Easy Returns',    'subtitle' => '14-day return policy'],
                        ['icon' => 'shield', 'title' => 'Secure Checkout', 'subtitle' => 'COD, Bank, Stripe, PayPal'],
                        ['icon' => 'phone',  'title' => '24/7 Support',    'subtitle' => 'WhatsApp us anytime'],
                    ],
                ]],
                ['type' => 'image_text', 'label' => 'Our story', 'config_json' => [
                    'image' => 'https://images.unsplash.com/photo-1551696785-927d4ac2d35b?auto=format&fit=crop&w=1200&q=80',
                    'image_position' => 'left', 'kicker' => 'Our Story', 'title' => 'Tradition Reimagined',
                    'body' => 'Every piece is crafted with care — premium fabrics, exquisite tailoring, and a love for Malaysian heritage. Modestwear that honours where you come from and how you live now.',
                    'button_text' => 'Learn More', 'button_url' => '/about',
                ]],
                ['type' => 'testimonials', 'label' => 'Testimonials', 'config_json' => [
                    'title' => 'Loved by our customers',
                    'items' => [
                        ['name' => 'Nur A.', 'rating' => 5, 'text' => 'The fit and quality are stunning. Will be coming back for Raya.'],
                        ['name' => 'Aisha M.', 'rating' => 5, 'text' => 'Beautiful hijabs, fast shipping, lovely packaging.'],
                        ['name' => 'Fatima R.', 'rating' => 5, 'text' => 'Customer service via WhatsApp was so helpful — felt personal.'],
                    ],
                ]],
                ['type' => 'newsletter', 'label' => 'Newsletter', 'config_json' => ['title' => 'Join the family', 'subtitle' => 'Get 10% off your first order + early access', 'button_text' => 'Subscribe']],
                ['type' => 'instagram', 'label' => 'Instagram feed', 'config_json' => [
                    'handle' => 'carlanisa.my',
                    'images' => [
                        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=600&q=80',
                    ],
                ]],
            ],
        ];
    }

    private static function raya(): array
    {
        return [
            'code' => 'raya',
            'name' => 'Raya Festive',
            'tag'  => 'Eid season — emerald + gold',
            'description' => 'Festive Eid scene: countdown to Raya, festive hero, gold accent everywhere, "Raya 2026" categories. Drop this in 4-6 weeks before Eid.',
            'sample' => ['#0f5132', '#d4af37', '#fdf8ec'],
            'settings' => [
                'preset' => 'raya',
                'color_primary' => '#0f5132', 'color_accent' => '#d4af37',
                'color_bg' => '#fdf8ec', 'color_surface' => '#ffffff',
                'color_text' => '#1c1c1c', 'color_muted' => '#5b6862', 'color_sale' => '#c1272d',
                'font_heading' => 'Playfair Display', 'font_body' => 'Lato',
            ],
            'bar' => ['text' => 'Selamat Hari Raya — Free shipping on all Raya 2026 orders ✨', 'bg_color' => '#0f5132', 'text_color' => '#d4af37'],
            'sections' => [
                ['type' => 'countdown', 'label' => 'Raya countdown', 'config_json' => [
                    'title' => 'Hari Raya 2026',
                    'subtitle' => 'Order before the rush — last shipping date approaching',
                    'ends_at' => now()->addDays(30)->format('Y-m-d\TH:i'),
                    'button_text' => 'Shop Raya Collection', 'button_url' => '/shop/baju-raya',
                ]],
                ['type' => 'hero_slider', 'label' => 'Raya hero', 'config_json' => [
                    'autoplay' => true, 'interval' => 6000,
                    'slides' => [
                        ['image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'Raya 2026', 'headline' => 'Celebrate in Elegance', 'subheading' => 'Handcrafted Baju Kurung & Kebaya for Hari Raya', 'button_text' => 'Shop Now', 'button_url' => '/shop/baju-raya', 'overlay' => 0.4, 'align' => 'center'],
                        ['image' => 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'Family Collection', 'headline' => 'Matching for the Whole Family', 'subheading' => 'Coordinated colours for parents and kids', 'button_text' => 'Discover', 'button_url' => '/shop/family-raya', 'overlay' => 0.35, 'align' => 'left'],
                    ],
                ]],
                ['type' => 'categories_grid', 'label' => 'Raya categories', 'config_json' => [
                    'title' => 'Shop the Raya Edit', 'subtitle' => 'Picked for the festive season', 'columns' => 3,
                    'categories' => [
                        ['name' => 'Baju Kurung Raya', 'image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/baju-raya'],
                        ['name' => 'Songket Hijab',     'image' => 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/songket-hijab'],
                        ['name' => 'Brooches & Accessories', 'image' => 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/accessories'],
                    ],
                ]],
                ['type' => 'featured_products', 'label' => 'Raya bestsellers', 'config_json' => ['title' => 'Raya Bestsellers', 'subtitle' => 'What everyone is loving this season', 'limit' => 8]],
                ['type' => 'banner_strip', 'label' => 'Raya promise', 'config_json' => [
                    'items' => [
                        ['icon' => 'gift',    'title' => 'Festive Packaging', 'subtitle' => 'Beautifully wrapped'],
                        ['icon' => 'truck',   'title' => 'Free Shipping',     'subtitle' => 'Above RM150'],
                        ['icon' => 'sparkles','title' => 'Limited Editions',  'subtitle' => 'Available till Raya'],
                        ['icon' => 'phone',   'title' => 'WhatsApp Help',     'subtitle' => 'Personal styling'],
                    ],
                ]],
                ['type' => 'newsletter', 'label' => 'Raya newsletter', 'config_json' => ['title' => 'Get 15% off your Raya order', 'subtitle' => 'Plus early access to limited drops', 'button_text' => 'Get Code']],
                ['type' => 'instagram', 'label' => 'Instagram feed', 'config_json' => [
                    'handle' => 'carlanisa.my',
                    'images' => [
                        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=600&q=80',
                    ],
                ]],
            ],
        ];
    }

    private static function luxury(): array
    {
        return [
            'code' => 'luxury',
            'name' => 'Luxury Boutique',
            'tag'  => 'Mytheresa / Net-a-Porter feel',
            'description' => 'Deep navy + warm gold + cream. Editorial-style hero, story-first layout, premium positioning.',
            'sample' => ['#1a2238', '#c9a063', '#f6f1ea'],
            'settings' => [
                'preset' => 'luxury',
                'color_primary' => '#1a2238', 'color_accent' => '#c9a063',
                'color_bg' => '#f6f1ea', 'color_surface' => '#ffffff',
                'color_text' => '#1a2238', 'color_muted' => '#5d6478', 'color_sale' => '#9b1c1c',
                'font_heading' => 'Cormorant Garamond', 'font_body' => 'Inter',
            ],
            'bar' => ['text' => 'Complimentary worldwide shipping on orders above RM500', 'bg_color' => '#1a2238', 'text_color' => '#c9a063'],
            'sections' => [
                ['type' => 'hero_slider', 'label' => 'Editorial hero', 'config_json' => [
                    'autoplay' => false,
                    'slides' => [
                        ['image' => 'https://images.unsplash.com/photo-1551696785-927d4ac2d35b?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'Spring 2026', 'headline' => 'The Atelier Collection', 'subheading' => 'Limited handcrafted pieces. Numbered, signed, eternal.', 'button_text' => 'Explore', 'button_url' => '/shop/atelier', 'overlay' => 0.45, 'align' => 'left'],
                    ],
                ]],
                ['type' => 'image_text', 'label' => 'Our atelier', 'config_json' => [
                    'image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
                    'image_position' => 'right', 'kicker' => 'The Atelier', 'title' => 'Crafted in Kuala Lumpur',
                    'body' => 'Every garment is conceived, cut and finished in our Kuala Lumpur atelier. Italian silks, French laces, hand-beaded by master artisans — pieces meant to outlast trends.',
                    'button_text' => 'Discover the Process', 'button_url' => '/atelier',
                ]],
                ['type' => 'categories_grid', 'label' => 'Categories', 'config_json' => [
                    'title' => 'The Collection', 'columns' => 2,
                    'categories' => [
                        ['name' => 'Atelier',  'image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80', 'url' => '/shop/atelier'],
                        ['name' => 'Daywear',  'image' => 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=900&q=80', 'url' => '/shop/daywear'],
                    ],
                ]],
                ['type' => 'featured_products', 'label' => 'Editor\'s pick', 'config_json' => ['title' => "Editor's Pick", 'subtitle' => 'Hand-selected for the season', 'limit' => 4]],
                ['type' => 'testimonials', 'label' => 'Press', 'config_json' => [
                    'title' => 'In the press',
                    'items' => [
                        ['name' => 'Harper\'s Bazaar', 'rating' => 5, 'text' => '"A masterclass in restraint and craftsmanship."'],
                        ['name' => 'Vogue Asia',       'rating' => 5, 'text' => '"The modestwear label redefining quiet luxury."'],
                        ['name' => 'The Edit',         'rating' => 5, 'text' => '"Heritage tailoring with a forward eye."'],
                    ],
                ]],
                ['type' => 'newsletter', 'label' => 'Newsletter', 'config_json' => ['title' => 'Join the inner circle', 'subtitle' => 'Private previews. Atelier-only releases.', 'button_text' => 'Subscribe']],
            ],
        ];
    }

    private static function modern(): array
    {
        return [
            'code' => 'modern',
            'name' => 'Modern Minimal',
            'tag'  => 'Allbirds / Aesop clean',
            'description' => 'Pure black on white, single accent red. Big bold type, generous whitespace, no clutter.',
            'sample' => ['#0a0a0a', '#ef4444', '#ffffff'],
            'settings' => [
                'preset' => 'modern',
                'color_primary' => '#0a0a0a', 'color_accent' => '#ef4444',
                'color_bg' => '#ffffff', 'color_surface' => '#fafafa',
                'color_text' => '#0a0a0a', 'color_muted' => '#737373', 'color_sale' => '#ef4444',
                'font_heading' => 'DM Sans', 'font_body' => 'DM Sans',
            ],
            'bar' => ['text' => 'Free shipping on every order this month', 'bg_color' => '#0a0a0a', 'text_color' => '#ffffff'],
            'sections' => [
                ['type' => 'hero_slider', 'label' => 'Hero', 'config_json' => [
                    'autoplay' => false,
                    'slides' => [
                        ['image' => 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1600&q=80', 'kicker' => '', 'headline' => 'Made simply. Worn beautifully.', 'subheading' => 'Modest essentials for every day.', 'button_text' => 'Shop Now', 'button_url' => '/shop', 'overlay' => 0.25, 'align' => 'left'],
                    ],
                ]],
                ['type' => 'banner_strip', 'label' => 'Promise', 'config_json' => [
                    'items' => [
                        ['icon' => 'truck',  'title' => 'Free shipping',    'subtitle' => 'Always'],
                        ['icon' => 'gift',   'title' => 'Free returns',     'subtitle' => '30 days'],
                        ['icon' => 'shield', 'title' => 'Made to last',     'subtitle' => 'Premium fabrics'],
                        ['icon' => 'heart',  'title' => 'Carbon-neutral',   'subtitle' => 'Every order'],
                    ],
                ]],
                ['type' => 'featured_products', 'label' => 'Latest', 'config_json' => ['title' => 'Latest', 'limit' => 8]],
                ['type' => 'rich_text', 'label' => 'Manifesto', 'config_json' => [
                    'kicker' => 'Why we exist', 'title' => 'Less, but better.',
                    'body' => 'We believe modest fashion should feel as effortless as it looks. No fast fashion. No filler. Just thoughtfully designed essentials, made to last, worn often.',
                    'align' => 'center', 'max_width' => 'narrow',
                ]],
                ['type' => 'newsletter', 'label' => 'Newsletter', 'config_json' => ['title' => 'Get the drop list', 'subtitle' => 'New pieces, first.', 'button_text' => 'Subscribe']],
            ],
        ];
    }

    private static function bold(): array
    {
        return [
            'code' => 'bold',
            'name' => 'Bold Sale',
            'tag'  => 'Black Friday / Mega sale',
            'description' => 'Red + yellow + cream. Loud, urgent. Countdown timer, big sale banners, bestsellers grid. Switch on for sale events.',
            'sample' => ['#dc2626', '#fbbf24', '#fffaf0'],
            'settings' => [
                'preset' => 'bold',
                'color_primary' => '#dc2626', 'color_accent' => '#fbbf24',
                'color_bg' => '#fffaf0', 'color_surface' => '#ffffff',
                'color_text' => '#18181b', 'color_muted' => '#71717a', 'color_sale' => '#ea580c',
                'font_heading' => 'Bebas Neue', 'font_body' => 'Inter',
            ],
            'bar' => ['text' => '🔥 MEGA SALE — Up to 70% OFF · Free shipping · Ends soon', 'bg_color' => '#dc2626', 'text_color' => '#ffffff'],
            'sections' => [
                ['type' => 'countdown', 'label' => 'Sale countdown', 'config_json' => [
                    'title' => 'Mega Sale Ends In',
                    'subtitle' => 'Up to 70% off · Free shipping · No code needed',
                    'ends_at' => now()->addDays(3)->format('Y-m-d\TH:i'),
                    'button_text' => 'Shop the Sale', 'button_url' => '/shop/sale',
                ]],
                ['type' => 'hero_slider', 'label' => 'Sale hero', 'config_json' => [
                    'autoplay' => true, 'interval' => 4000,
                    'slides' => [
                        ['image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'MEGA SALE', 'headline' => 'Up to 70% Off', 'subheading' => 'Storewide. No code needed.', 'button_text' => 'Shop Sale', 'button_url' => '/shop/sale', 'overlay' => 0.3, 'align' => 'center'],
                        ['image' => 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=1600&q=80', 'kicker' => 'NEW MARKDOWNS', 'headline' => 'Best Sellers Just Dropped to Sale', 'subheading' => 'Hurry — sizes selling out fast', 'button_text' => 'Shop Now', 'button_url' => '/shop/best-sellers', 'overlay' => 0.3, 'align' => 'center'],
                    ],
                ]],
                ['type' => 'banner_strip', 'label' => 'Urgency banners', 'config_json' => [
                    'items' => [
                        ['icon' => 'sparkles', 'title' => '70% Off',         'subtitle' => 'Storewide'],
                        ['icon' => 'truck',    'title' => 'Free Shipping',   'subtitle' => 'No minimum'],
                        ['icon' => 'gift',     'title' => 'Free Gift',       'subtitle' => 'Above RM200'],
                        ['icon' => 'phone',    'title' => '24h Support',     'subtitle' => 'Order now'],
                    ],
                ]],
                ['type' => 'featured_products', 'label' => 'Top sellers', 'config_json' => ['title' => 'Top Sellers — Sale', 'subtitle' => 'Selling out fast', 'limit' => 8]],
                ['type' => 'testimonials', 'label' => 'Reviews', 'config_json' => [
                    'title' => 'Customers love the prices',
                    'items' => [
                        ['name' => 'Sara K.', 'rating' => 5, 'text' => 'Couldn\'t believe the quality at sale prices!'],
                        ['name' => 'Nadia S.', 'rating' => 5, 'text' => 'Bought 3 pieces, all stunning.'],
                        ['name' => 'Aini R.', 'rating' => 5, 'text' => 'Fast shipping even during sale week.'],
                    ],
                ]],
                ['type' => 'newsletter', 'label' => 'Newsletter', 'config_json' => ['title' => 'Be first for the next sale', 'subtitle' => 'Get RM20 off your next order', 'button_text' => 'Get RM20 Off']],
            ],
        ];
    }
}
