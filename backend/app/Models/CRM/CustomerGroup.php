<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class CustomerGroup extends Model
{
    protected $table = 'crm_customer_groups';
    protected $fillable = ['code','name','color','default_discount_pct','credit_days','is_active'];
    protected $casts = ['default_discount_pct' => 'float','credit_days' => 'integer','is_active' => 'boolean'];
}
