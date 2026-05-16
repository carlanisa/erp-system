<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfficeLocationController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success(OfficeLocation::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $row = OfficeLocation::create($data + ['is_active' => true]);
        return $this->success($row, 'Office location added', 201);
    }

    public function update(Request $request, OfficeLocation $officeLocation): JsonResponse
    {
        $data = $this->validatePayload($request, $officeLocation->id);
        $officeLocation->update($data);
        return $this->success($officeLocation);
    }

    public function destroy(OfficeLocation $officeLocation): JsonResponse
    {
        $officeLocation->delete();
        return $this->success(null, 'Deleted');
    }

    private function validatePayload(Request $request, ?int $existing = null): array
    {
        $codeRule = 'required|string|max:30|unique:hrm_office_locations,code' . ($existing ? ',' . $existing : '');
        return $request->validate([
            'code'              => $codeRule,
            'name'              => 'required|string|max:120',
            'address'           => 'nullable|string',
            'lat'               => 'required|numeric|between:-90,90',
            'lng'               => 'required|numeric|between:-180,180',
            'geofence_radius_m' => 'required|integer|min:10|max:5000',
            'contact_phone'     => 'nullable|string|max:50',
            'is_active'         => 'sometimes|boolean',
        ]);
    }
}
