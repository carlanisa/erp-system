<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Activity extends Model
{
    protected $table = 'crm_activities';
    protected $fillable = [
        'activity_type_id','customer_id','lead_id','owner_user_id',
        'subject','description','scheduled_at','completed_at','outcome',
    ];
    protected $casts = [
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function type(): BelongsTo     { return $this->belongsTo(ActivityType::class, 'activity_type_id'); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function lead(): BelongsTo     { return $this->belongsTo(Lead::class); }
}
