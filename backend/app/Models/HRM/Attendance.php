<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'check_in', 'check_out', 'status', 'notes',
        'office_location_id', 'check_in_method',
        'check_in_lat', 'check_in_lng',
        'check_out_lat', 'check_out_lng',
        'face_match_score', 'within_geofence', 'device_info',
    ];

    protected $casts = [
        'date'             => 'date:Y-m-d',
        'within_geofence'  => 'boolean',
        'device_info'      => 'array',
        'face_match_score' => 'float',
        'check_in_lat'     => 'float',
        'check_in_lng'     => 'float',
        'check_out_lat'    => 'float',
        'check_out_lng'    => 'float',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function officeLocation(): BelongsTo
    {
        return $this->belongsTo(OfficeLocation::class);
    }

    public function getWorkHoursAttribute(): ?float
    {
        if (!$this->check_in || !$this->check_out) return null;
        $in  = strtotime($this->check_in);
        $out = strtotime($this->check_out);
        return round(($out - $in) / 3600, 2);
    }
}
