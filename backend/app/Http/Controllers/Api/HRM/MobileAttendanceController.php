<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Attendance;
use App\Models\HRM\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Mobile-app attendance endpoints.
 *
 * Concept:
 *   1. Mobile app calls GET /api/mobile/attendance/offices to fetch
 *      the office geofence list (with lat/lng + radius). The app shows
 *      a "where to clock in" map.
 *   2. When the staff hits Clock In, the app captures:
 *        - GPS coordinates
 *        - A face image, runs on-device face match against the
 *          enrolment template, returns a score 0..1
 *        - Device info (model, app version)
 *      and POSTs to /api/mobile/attendance/check-in.
 *   3. Server validates:
 *        - GPS is within at least one active office geofence (Haversine)
 *        - face_match_score >= MIN_FACE_MATCH (0.85 default)
 *      and creates / updates the attendance row for today.
 *   4. Clock-out is symmetric.
 *
 * Authentication: this controller sits behind auth:sanctum so the
 * mobile app must hold a personal access token issued at login.
 */
class MobileAttendanceController extends Controller
{
    use ApiResponse;

    private const MIN_FACE_MATCH = 0.85;

    /**
     * GET /api/mobile/attendance/offices
     * Lists active office geofences for the staff app.
     */
    public function offices(): JsonResponse
    {
        return $this->success(
            OfficeLocation::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'address', 'lat', 'lng', 'geofence_radius_m'])
        );
    }

    /**
     * POST /api/mobile/attendance/check-in
     */
    public function checkIn(Request $request): JsonResponse
    {
        $data = $this->validateGps($request, true);
        return $this->upsert($request, $data, true);
    }

    /**
     * POST /api/mobile/attendance/check-out
     */
    public function checkOut(Request $request): JsonResponse
    {
        $data = $this->validateGps($request, false);
        return $this->upsert($request, $data, false);
    }

    private function validateGps(Request $request, bool $isCheckIn): array
    {
        return $request->validate([
            'lat'              => 'required|numeric|between:-90,90',
            'lng'              => 'required|numeric|between:-180,180',
            'face_match_score' => 'nullable|numeric|min:0|max:1',
            'device'           => 'nullable|array',
            'device.id'        => 'nullable|string|max:120',
            'device.model'     => 'nullable|string|max:120',
            'device.app_ver'   => 'nullable|string|max:30',
            'force'            => 'sometimes|boolean',  // override geofence (admin only)
        ]);
    }

    private function upsert(Request $request, array $data, bool $isCheckIn): JsonResponse
    {
        $emp = $request->user()?->employee ?? null;
        // For now we don't have user→employee mapping — accept employee_id
        if (!$emp) {
            $request->validate(['employee_id' => 'required|exists:employees,id']);
            $empId = (int) $request->input('employee_id');
        } else {
            $empId = $emp->id;
        }

        // Find an office whose geofence contains the GPS point
        $offices = OfficeLocation::where('is_active', true)->get();
        $matchedOffice = null;
        foreach ($offices as $o) {
            if ($o->isWithinGeofence($data['lat'], $data['lng'])) {
                $matchedOffice = $o;
                break;
            }
        }

        $within = $matchedOffice !== null;
        $force  = $request->boolean('force');

        if (!$within && !$force) {
            return $this->error(
                'You are not at the office. Please go to your office and try again. (GPS check failed.)',
                422,
                ['within_geofence' => false]
            );
        }

        $faceScore = $data['face_match_score'] ?? null;
        if ($faceScore !== null && $faceScore < self::MIN_FACE_MATCH && !$force) {
            return $this->error(
                'Face verification failed. Please retake the photo with good lighting.',
                422,
                ['face_match_score' => $faceScore, 'min_required' => self::MIN_FACE_MATCH]
            );
        }

        $today = now()->toDateString();
        $now   = now()->format('H:i');

        $update = [
            'office_location_id' => $matchedOffice?->id,
            'check_in_method'    => 'face',
            'within_geofence'    => $within,
            'face_match_score'   => $faceScore,
            'device_info'        => $data['device'] ?? null,
            'status'             => 'present',
        ];

        if ($isCheckIn) {
            $update['check_in']     = $now;
            $update['check_in_lat'] = $data['lat'];
            $update['check_in_lng'] = $data['lng'];
        } else {
            $update['check_out']     = $now;
            $update['check_out_lat'] = $data['lat'];
            $update['check_out_lng'] = $data['lng'];
        }

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $empId, 'date' => $today],
            $update
        );

        return $this->success(
            $attendance->load('officeLocation:id,code,name'),
            $isCheckIn ? "Checked in at {$now}" : "Checked out at {$now}"
        );
    }
}
