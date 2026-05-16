<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class FollowUpRule extends Model
{
    protected $table = 'crm_follow_up_rules';
    protected $fillable = ['title','trigger','days_offset','channel','template','is_active'];
    protected $casts = ['days_offset' => 'integer','is_active' => 'boolean'];
}
