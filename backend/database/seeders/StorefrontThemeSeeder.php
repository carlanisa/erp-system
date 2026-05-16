<?php

namespace Database\Seeders;

use App\Models\Storefront\AnnouncementBar;
use App\Models\Storefront\Section;
use App\Models\Storefront\ThemeSetting;
use Illuminate\Database\Seeder;

class StorefrontThemeSeeder extends Seeder
{
    public function run(): void
    {
        // Default theme — Carlanisa-inspired luxe modestwear palette
        ThemeSetting::firstOrCreate([], [
            'preset'        => 'carlanisa',
            'color_primary' => '#5d2a2a',
            'color_accent'  => '#b8860b',
            'color_bg'      => '#fdfaf5',
            'color_surface' => '#ffffff',
            'color_text'    => '#2b1d14',
            'color_muted'   => '#6b5d4f',
            'color_sale'    => '#dc2626',
            'font_heading'  => 'Playfair Display',
            'font_body'     => 'Inter',
            'brand_name'    => 'Modestwear',
            'brand_tagline' => 'Curated modestwear for the modern Malaysian woman.',
            'currency_display' => 'RM',
        ]);

        // Announcement bar
        AnnouncementBar::firstOrCreate(
            ['text' => '20% Off All Clothing. Limited time offer!'],
            ['bg_color' => '#5d2a2a', 'text_color' => '#ffffff', 'active' => true, 'sort_order' => 1],
        );

        // Default homepage sections — 7 sections out of the box
        $sections = [
            [
                'type' => 'hero_slider', 'label' => 'Hero slider', 'position' => 1,
                'config_json' => [
                    'slides' => [
                        [
                            'image'   => 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=80',
                            'kicker'  => 'New Arrival',
                            'headline'=> 'Latest Collection 2026',
                            'subheading' => 'Modern Malaysian modestwear, handpicked for the season',
                            'button_text' => 'Shop Now',
                            'button_url'  => '/shop',
                            'overlay'  => 0.35,
                            'align'    => 'left',
                        ],
                        [
                            'image'   => 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=1600&q=80',
                            'kicker'  => 'Baju Raya 2026',
                            'headline'=> 'Celebrate in Elegance',
                            'subheading' => 'Premium Baju Kurung with exquisite tailoring',
                            'button_text' => 'Discover More',
                            'button_url'  => '/shop/baju-kurung',
                            'overlay'  => 0.30,
                            'align'    => 'center',
                        ],
                    ],
                    'autoplay' => true,
                    'interval' => 5500,
                ],
            ],
            [
                'type' => 'categories_grid', 'label' => 'Shop by category', 'position' => 2,
                'config_json' => [
                    'title' => 'Shop by Category',
                    'subtitle' => 'Discover our curated collections',
                    'columns' => 3,
                    'categories' => [
                        ['name' => 'Baju Kurung', 'image' => 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/baju-kurung'],
                        ['name' => 'Hijab',       'image' => 'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/hijab'],
                        ['name' => 'New Arrivals','image' => 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=800&q=80', 'url' => '/shop/new-arrivals'],
                    ],
                ],
            ],
            [
                'type' => 'featured_products', 'label' => 'Featured products', 'position' => 3,
                'config_json' => ['title' => 'Featured This Week', 'subtitle' => 'Our best-loved styles', 'limit' => 8],
            ],
            [
                'type' => 'banner_strip', 'label' => 'Free shipping banner', 'position' => 4,
                'config_json' => [
                    'items' => [
                        ['icon' => 'truck',  'title' => 'Free Shipping',   'subtitle' => 'On orders over RM150'],
                        ['icon' => 'gift',   'title' => 'Easy Returns',    'subtitle' => '14-day return policy'],
                        ['icon' => 'shield', 'title' => 'Secure Checkout', 'subtitle' => 'COD, Bank, Stripe, PayPal'],
                        ['icon' => 'phone',  'title' => '24/7 Support',    'subtitle' => 'WhatsApp us anytime'],
                    ],
                ],
            ],
            [
                'type' => 'image_text', 'label' => 'Our story', 'position' => 5,
                'config_json' => [
                    'image' => 'https://images.unsplash.com/photo-1551696785-927d4ac2d35b?auto=format&fit=crop&w=1200&q=80',
                    'image_position' => 'left',
                    'kicker' => 'Our Story',
                    'title'  => 'Tradition Reimagined',
                    'body'   => 'Every piece is crafted with care — premium fabrics, exquisite tailoring, and a love for Malaysian heritage. Modestwear that honours where you come from and how you live now.',
                    'button_text' => 'Learn More',
                    'button_url'  => '/about',
                ],
            ],
            [
                'type' => 'testimonials', 'label' => 'Testimonials', 'position' => 6,
                'config_json' => [
                    'title' => 'Loved by our customers',
                    'items' => [
                        ['name' => 'Nur A.', 'rating' => 5, 'text' => 'The fit and quality are stunning. Will be coming back for Raya.'],
                        ['name' => 'Aisha M.', 'rating' => 5, 'text' => 'Beautiful hijabs, fast shipping, lovely packaging.'],
                        ['name' => 'Fatima R.', 'rating' => 5, 'text' => 'Customer service via WhatsApp was so helpful — felt personal.'],
                    ],
                ],
            ],
            [
                'type' => 'newsletter', 'label' => 'Newsletter signup', 'position' => 7,
                'config_json' => [
                    'title' => 'Join the family',
                    'subtitle' => 'Get 10% off your first order + early access to new collections',
                    'button_text' => 'Subscribe',
                ],
            ],
            [
                'type' => 'instagram', 'label' => 'Instagram feed', 'position' => 8,
                'config_json' => [
                    'handle' => 'modestwear',
                    'images' => [
                        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1611042553484-d61f84d22784?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=600&q=80',
                    ],
                ],
            ],
        ];

        foreach ($sections as $s) {
            Section::firstOrCreate(['type' => $s['type'], 'label' => $s['label']], $s);
        }
    }
}
