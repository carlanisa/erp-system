<?php

namespace Database\Seeders;

use App\Models\Storefront\CrossSellRule;
use App\Models\Storefront\VoucherRule;
use Illuminate\Database\Seeder;

class StorefrontGrowthSeeder extends Seeder
{
    public function run(): void
    {
        // Default cross-sell rules: Baju Kurung -> Hijab + Brooch + Inner
        $rules = [
            [
                'name' => 'Baju Kurung → Matching Hijab + Brooch',
                'anchor_type' => 'category', 'anchor_value' => 'baju kurung',
                'suggest_categories' => ['hijab', 'brooch', 'inner'],
                'reason_text' => 'These would look beautiful with your Baju Kurung — complete the look ✨',
                'max_suggestions' => 4, 'priority' => 10,
            ],
            [
                'name' => 'Hijab → Inner + Brooch',
                'anchor_type' => 'category', 'anchor_value' => 'hijab',
                'suggest_categories' => ['inner', 'brooch'],
                'reason_text' => 'Pair your hijab with these',
                'max_suggestions' => 4, 'priority' => 20,
            ],
            [
                'name' => 'Brooch → Hijab',
                'anchor_type' => 'category', 'anchor_value' => 'brooch',
                'suggest_categories' => ['hijab'],
                'reason_text' => 'Goes well with these hijabs',
                'max_suggestions' => 4, 'priority' => 30,
            ],
        ];
        foreach ($rules as $r) {
            CrossSellRule::updateOrCreate(['name' => $r['name']], $r);
        }

        // Default voucher rules — every behavior trigger gets a tasteful offer
        $voucherRules = [
            [
                'name' => 'Welcome — free shipping on first add',
                'trigger' => 'add_to_cart_first',
                'voucher_type' => 'free_shipping', 'value' => 0,
                'min_subtotal' => 0,
                'valid_minutes' => 30, 'max_per_session' => 1,
                'headline' => 'Welcome! Here is free shipping on your first order 🚚',
                'subtext'  => 'Apply this code at checkout. Expires in 30 minutes.',
                'priority' => 10, 'active' => true,
            ],
            [
                'name' => 'Nearly free shipping — top-up nudge',
                'trigger' => 'threshold_near',
                'voucher_type' => 'free_shipping', 'value' => 0,
                'min_subtotal' => 0,
                'valid_minutes' => 20, 'max_per_session' => 1,
                'threshold_min' => 100,
                'headline' => 'You unlocked free shipping 🎉',
                'subtext'  => 'Code is valid for 20 minutes.',
                'priority' => 20, 'active' => true,
            ],
            [
                'name' => '5% off after idle in cart',
                'trigger' => 'idle_in_cart',
                'voucher_type' => 'percent', 'value' => 5,
                'min_subtotal' => 80,
                'valid_minutes' => 15, 'max_per_session' => 1,
                'idle_seconds' => 90,
                'headline' => 'Still thinking? Here is 5% off — just for you',
                'subtext'  => 'Code expires in 15 minutes.',
                'priority' => 30, 'active' => true,
            ],
            [
                'name' => '10% off on exit intent (>RM150)',
                'trigger' => 'exit_intent',
                'voucher_type' => 'percent', 'value' => 10,
                'min_subtotal' => 150,
                'valid_minutes' => 15, 'max_per_session' => 1,
                'headline' => 'Wait! Here is 10% off if you check out now',
                'subtext'  => 'Code expires in 15 minutes.',
                'priority' => 40, 'active' => true,
            ],
            [
                'name' => 'RM10 off on exit intent (<RM150)',
                'trigger' => 'exit_intent',
                'voucher_type' => 'fixed', 'value' => 10,
                'min_subtotal' => 60,
                'valid_minutes' => 15, 'max_per_session' => 1,
                'headline' => 'Wait! Here is RM10 off — just for you',
                'subtext'  => 'Code expires in 15 minutes.',
                'priority' => 50, 'active' => true,
            ],
        ];
        foreach ($voucherRules as $r) {
            VoucherRule::updateOrCreate(['name' => $r['name']], $r);
        }
    }
}
