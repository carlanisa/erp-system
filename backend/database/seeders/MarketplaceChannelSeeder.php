<?php

namespace Database\Seeders;

use App\Models\Marketplace\MarketplaceChannel;
use Illuminate\Database\Seeder;

class MarketplaceChannelSeeder extends Seeder
{
    public function run(): void
    {
        $channels = [
            ['code' => 'shopee_my', 'name' => 'Shopee MY', 'region' => 'MY', 'color' => '#EE4D2D'],
            ['code' => 'shopee_sg', 'name' => 'Shopee SG', 'region' => 'SG', 'color' => '#EE4D2D'],
            ['code' => 'tiktok_my', 'name' => 'TikTok Shop MY', 'region' => 'MY', 'color' => '#000000'],
            ['code' => 'website',   'name' => 'Website',        'region' => 'MY', 'color' => '#2563EB'],
        ];

        foreach ($channels as $c) {
            MarketplaceChannel::firstOrCreate(['code' => $c['code']], $c);
        }
    }
}
