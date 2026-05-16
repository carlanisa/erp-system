<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class LeadSource extends Model
{
    protected $table = 'crm_lead_sources';
    protected $fillable = ['code','name','color','is_active','sort_order'];
    protected $casts = ['is_active' => 'boolean','sort_order' => 'integer'];
}
