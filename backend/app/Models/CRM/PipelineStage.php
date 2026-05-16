<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class PipelineStage extends Model
{
    protected $table = 'crm_pipeline_stages';
    protected $fillable = ['name','color','win_probability','sort_order','is_active'];
    protected $casts = ['win_probability' => 'float','sort_order' => 'integer','is_active' => 'boolean'];
}
