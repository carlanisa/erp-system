<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Holiday;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $year = (int) ($request->year ?? now()->year);

        $rows = Holiday::query()
            ->whereYear('date', $year)
            ->orderBy('date')
            ->get();

        return $this->success($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'      => 'required|date',
            'name'      => 'required|string|max:120',
            'type'      => 'in:public,company,religious',
            'notes'     => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $row = Holiday::create($data);
        return $this->success($row, 'Holiday added', 201);
    }

    public function update(Request $request, Holiday $holiday): JsonResponse
    {
        $data = $request->validate([
            'date'      => 'sometimes|date',
            'name'      => 'sometimes|string|max:120',
            'type'      => 'in:public,company,religious',
            'notes'     => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $holiday->update($data);
        return $this->success($holiday);
    }

    public function destroy(Holiday $holiday): JsonResponse
    {
        $holiday->delete();
        return $this->success(null, 'Holiday deleted');
    }
}
