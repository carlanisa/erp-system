<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $table = 'crm_leads';
    protected $fillable = [
        'name','phone','email','source_id','stage_id','owner_user_id','customer_id',
        'expected_value','expected_close_date','status','description','notes','last_activity_date',
    ];
    protected $casts = [
        'expected_value' => 'float',
        'expected_close_date' => 'date',
        'last_activity_date' => 'date',
    ];

    public function source(): BelongsTo  { return $this->belongsTo(LeadSource::class, 'source_id'); }
    public function stage(): BelongsTo   { return $this->belongsTo(PipelineStage::class, 'stage_id'); }
    public function customer(): BelongsTo{ return $this->belongsTo(Customer::class); }
}
