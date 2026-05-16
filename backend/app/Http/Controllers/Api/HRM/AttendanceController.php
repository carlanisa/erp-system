<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Attendance;
use App\Models\HRM\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    use ApiResponse;

    /**
     * Daily attendance sheet — returns one row per active employee
     * with the current attendance state (or null if not marked yet).
     */
    public function index(Request $request): JsonResponse
    {
        $date = $request->date ?? now()->toDateString();

        $employees = Employee::where('status', 'active')->orderBy('name')->get();

        $records = Attendance::where('date', $date)->get()->keyBy('employee_id');

        $rows = $employees->map(function ($emp) use ($records) {
            $att = $records->get($emp->id);
            return [
                'id'            => $emp->id,
                'name'          => $emp->name,
                'employee_code' => $emp->employee_code,
                'department'    => $emp->department,
                'designation'   => $emp->designation,
                'status'        => $att->status    ?? null,
                'check_in'      => $att?->check_in ? substr((string) $att->check_in, 0, 5) : null,
                'check_out'     => $att?->check_out ? substr((string) $att->check_out, 0, 5) : null,
                'notes'         => $att->notes ?? null,
            ];
        })->values();

        return $this->success($rows);
    }

    /**
     * Bulk-save attendance for a given date.
     * Accepts either { date, records: [{employee_id, status, check_in?, check_out?, notes?}] }
     * or the legacy { date, attendances: [...] } shape.
     */
    public function markBulk(Request $request): JsonResponse
    {
        // Normalise the legacy `attendances` key into `records`
        if ($request->has('attendances') && !$request->has('records')) {
            $request->merge(['records' => $request->input('attendances')]);
        }

        $data = $request->validate([
            'date'                  => 'required|date',
            'records'               => 'required|array|min:1',
            'records.*.employee_id' => 'required|exists:employees,id',
            'records.*.status'      => 'required|in:present,absent,half_day,on_leave',
            'records.*.check_in'    => 'nullable|date_format:H:i',
            'records.*.check_out'   => 'nullable|date_format:H:i',
            'records.*.notes'       => 'nullable|string',
        ]);

        $saved = 0;
        foreach ($data['records'] as $rec) {
            Attendance::updateOrCreate(
                ['employee_id' => $rec['employee_id'], 'date' => $data['date']],
                [
                    'status'    => $rec['status'],
                    'check_in'  => $rec['check_in']  ?? null,
                    'check_out' => $rec['check_out'] ?? null,
                    'notes'     => $rec['notes']     ?? null,
                ]
            );
            $saved++;
        }

        return $this->success(['saved' => $saved], "Attendance saved for {$saved} employee(s)");
    }

    public function markSingle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date'        => 'required|date',
            'status'      => 'required|in:present,absent,half_day,on_leave',
            'check_in'    => 'nullable|date_format:H:i',
            'check_out'   => 'nullable|date_format:H:i',
            'notes'       => 'nullable|string',
        ]);

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'date' => $data['date']],
            $data
        );

        return $this->success($attendance);
    }

    /**
     * Returns last 6 months of attendance summaries for an employee
     * (newest first). Each month includes counts and total working days.
     */
    public function employeeHistory(Employee $employee, Request $request): JsonResponse
    {
        $months = (int) ($request->months ?? 6);
        $months = max(1, min(24, $months));

        $cursor = now()->startOfMonth();
        $out    = [];

        for ($i = 0; $i < $months; $i++) {
            $month = $cursor->month;
            $year  = $cursor->year;

            $records = Attendance::where('employee_id', $employee->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->get();

            $present  = $records->where('status', 'present')->count();
            $absent   = $records->where('status', 'absent')->count();
            $halfDay  = $records->where('status', 'half_day')->count();
            $onLeave  = $records->where('status', 'on_leave')->count();

            $out[] = [
                'month'              => $month,
                'year'               => $year,
                'present'            => $present,
                'absent'             => $absent,
                'half_day'           => $halfDay,
                'on_leave'           => $onLeave,
                'total_working_days' => $present + $absent + $halfDay + $onLeave,
            ];

            $cursor->subMonth();
        }

        return $this->success($out);
    }
}
