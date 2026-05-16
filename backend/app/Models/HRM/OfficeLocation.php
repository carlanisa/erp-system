<?php

namespace App\Models\HRM;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficeLocation extends Model
{
    protected $table = 'hrm_office_locations';

    protected $fillable = [
        'code', 'name', 'address',
        'lat', 'lng', 'geofence_radius_m',
        'contact_phone', 'is_active',
    ];

    protected $casts = [
        'lat'                => 'float',
        'lng'                => 'float',
        'geofence_radius_m'  => 'integer',
        'is_active'          => 'boolean',
    ];

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Haversine distance in metres from a point to this office.
     */
    public function distanceTo(float $lat, float $lng): float
    {
        $earthM = 6_371_000.0;
        $lat1 = deg2rad($this->lat);
        $lat2 = deg2rad($lat);
        $dLat = deg2rad($lat - $this->lat);
        $dLng = deg2rad($lng - $this->lng);
        $a = sin($dLat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($dLng / 2) ** 2;
        return 2 * $earthM * asin(min(1, sqrt($a)));
    }

    public function isWithinGeofence(float $lat, float $lng): bool
    {
        return $this->distanceTo($lat, $lng) <= $this->geofence_radius_m;
    }
}
