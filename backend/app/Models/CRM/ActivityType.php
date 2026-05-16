<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class ActivityType extends Model
{
    protected $table = 'crm_activity_types';
    protected $fillable = ['code','name','color','is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
