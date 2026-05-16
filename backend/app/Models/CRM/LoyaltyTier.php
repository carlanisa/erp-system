<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class LoyaltyTier extends Model
{
    protected $table = 'crm_loyalty_tiers';
    protected $fillable = ['name','threshold_amount','points_multiplier','color','perks','is_active'];
    protected $casts = ['threshold_amount' => 'float','points_multiplier' => 'float','is_active' => 'boolean'];
}
