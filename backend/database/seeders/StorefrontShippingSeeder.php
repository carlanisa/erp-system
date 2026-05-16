<?php

namespace Database\Seeders;

use App\Models\Storefront\ShippingZone;
use Illuminate\Database\Seeder;

class StorefrontShippingSeeder extends Seeder
{
    public function run(): void
    {
        $wmStates = [
            'MY-01', // Johor
            'MY-02', // Kedah
            'MY-03', // Kelantan
            'MY-04', // Melaka
            'MY-05', // Negeri Sembilan
            'MY-06', // Pahang
            'MY-07', // Pulau Pinang
            'MY-08', // Perak
            'MY-09', // Perlis
            'MY-10', // Selangor
            'MY-11', // Terengganu
            'MY-14', // WP Kuala Lumpur
            'MY-16', // WP Putrajaya
        ];
        $emStates = [
            'MY-12', // Sabah
            'MY-13', // Sarawak
            'MY-15', // WP Labuan
        ];

        $wm = ShippingZone::updateOrCreate(
            ['code' => 'WM'],
            ['name' => 'West Malaysia', 'country_code' => 'MY', 'state_codes' => $wmStates, 'enabled' => true, 'sort_order' => 1],
        );
        $wm->rates()->delete();
        $wm->rates()->create(['name' => 'Standard', 'flat_rate' => 8.00, 'free_over' => 150.00, 'enabled' => true]);

        $em = ShippingZone::updateOrCreate(
            ['code' => 'EM'],
            ['name' => 'East Malaysia', 'country_code' => 'MY', 'state_codes' => $emStates, 'enabled' => true, 'sort_order' => 2],
        );
        $em->rates()->delete();
        $em->rates()->create(['name' => 'Standard', 'flat_rate' => 18.00, 'free_over' => 250.00, 'enabled' => true]);

        // Example: Singapore international zone with weight tiers
        $sg = ShippingZone::updateOrCreate(
            ['code' => 'SG'],
            ['name' => 'Singapore', 'country_code' => 'SG', 'state_codes' => null, 'enabled' => true, 'sort_order' => 3],
        );
        $sg->rates()->delete();
        $sg->rates()->create(['name' => 'Up to 0.5 kg', 'weight_min' => 0,   'weight_max' => 0.5, 'flat_rate' => 30.00, 'enabled' => true, 'sort_order' => 1]);
        $sg->rates()->create(['name' => '0.5 - 1 kg',   'weight_min' => 0.5, 'weight_max' => 1.0, 'flat_rate' => 45.00, 'enabled' => true, 'sort_order' => 2]);
    }
}
