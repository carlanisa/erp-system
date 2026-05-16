<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployeeController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $employees = Employee::query()
            ->with(['dept:id,code,name', 'desig:id,title', 'shift:id,code,name'])
            ->when($request->search, fn($q) =>
                $q->where(function ($w) use ($request) {
                    $w->where('name', 'like', "%{$request->search}%")
                      ->orWhere('email', 'like', "%{$request->search}%")
                      ->orWhere('employee_code', 'like', "%{$request->search}%")
                      ->orWhere('ic_passport_no', 'like', "%{$request->search}%");
                }))
            ->when($request->department, fn($q) => $q->where('department', $request->department))
            ->when($request->department_id, fn($q) => $q->where('department_id', $request->department_id))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderBy('name')
            ->paginate(20);

        return $this->paginated($employees);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $data['employee_code'] = $this->generateCode();
        $data['status']        = $data['status'] ?? 'active';

        $employee = Employee::create($data);

        // Hire hook: if designation has an active job description, surface it to the manager
        if ($employee->designation_id) {
            $jd = \App\Models\HRM\JobDescription::where('designation_id', $employee->designation_id)
                ->where('is_active', true)
                ->latest('id')
                ->first();
            if ($jd) {
                app(\App\Services\NotificationService::class)->send(
                    $employee,
                    'hire.jd_ready',
                    'Welcome ' . $employee->name . ' — job description ready',
                    'A job description exists for this role. The manager can generate tasks with AI and assign them.',
                    '/projects?tab=jds',
                    ['employee_id' => $employee->id, 'jd_id' => $jd->id]
                );
            }
        }

        return $this->success($employee->load(['dept:id,code,name','desig:id,title','shift:id,code,name']), 'Employee created', 201);
    }

    public function show(Employee $employee): JsonResponse
    {
        return $this->success(
            $employee->load(['dept:id,code,name','desig:id,title','shift:id,code,name','attendances','leaveRequests','payrolls'])
        );
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $data = $this->validatePayload($request, $employee->id);
        $employee->update($data);
        return $this->success($employee->load(['dept:id,code,name','desig:id,title','shift:id,code,name']), 'Employee updated');
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();
        return $this->success(null, 'Employee deleted');
    }

    /**
     * POST /api/hrm/employees/{employee}/image
     * Upload or replace the employee photo.
     */
    public function uploadImage(Request $request, Employee $employee): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:4096',
        ]);

        if ($employee->image_path && Storage::disk('public')->exists($employee->image_path)) {
            Storage::disk('public')->delete($employee->image_path);
        }

        $stored = $request->file('image')->store('employees/photos', 'public');
        $employee->update(['image_path' => $stored]);

        return $this->success($employee->fresh(), 'Photo uploaded');
    }

    public function departments(): JsonResponse
    {
        return $this->success(
            Employee::where('status', 'active')->distinct()->orderBy('department')->pluck('department')
        );
    }

    public function stats(): JsonResponse
    {
        $today = now()->toDateString();
        $month = now()->month;
        $year  = now()->year;

        $payrollThisMonth = \App\Models\HRM\Payroll::where('month', $month)
            ->where('year', $year)
            ->sum('net_salary');

        $totalPayroll = $payrollThisMonth > 0
            ? $payrollThisMonth
            : (float) Employee::where('status', 'active')->sum('basic_salary');

        return $this->success([
            'total'          => Employee::where('status', 'active')->count(),
            'present_today'  => \App\Models\HRM\Attendance::where('date', $today)->where('status', 'present')->count(),
            'on_leave'       => \App\Models\HRM\Attendance::where('date', $today)->where('status', 'on_leave')->count(),
            'absent'         => \App\Models\HRM\Attendance::where('date', $today)->where('status', 'absent')->count(),
            'departments'    => Employee::where('status', 'active')->distinct()->count('department'),
            'pending_leaves' => \App\Models\HRM\LeaveRequest::where('status', 'pending')->count(),
            'total_payroll'  => $totalPayroll,
        ]);
    }

    private function validatePayload(Request $request, ?int $existingId = null): array
    {
        $emailRule = 'nullable|email|unique:employees,email' . ($existingId ? ',' . $existingId : '');

        return $request->validate([
            'name'              => $existingId ? 'sometimes|string|max:255' : 'required|string|max:255',
            'email'             => $emailRule,
            'phone'             => 'nullable|string|max:30',
            'cnic'              => 'nullable|string|max:30',

            // Master refs (preferred over free-text)
            'department_id'     => 'nullable|exists:hrm_departments,id',
            'designation_id'    => 'nullable|exists:hrm_designations,id',
            'shift_id'          => 'nullable|exists:hrm_shifts,id',

            // Free-text fallbacks (kept for compatibility / display)
            'department'        => 'nullable|string|max:100',
            'designation'       => 'nullable|string|max:100',

            'join_date'         => $existingId ? 'sometimes|date' : 'required|date',
            'basic_salary'      => $existingId ? 'sometimes|numeric|min:0' : 'required|numeric|min:0',

            'address'           => 'nullable|string',
            'location'          => 'nullable|string|max:120',

            'epf_no'            => 'nullable|string|max:50',
            'socso_no'          => 'nullable|string|max:50',
            'tax_no'            => 'nullable|string|max:50',

            'ic_type'           => 'nullable|in:ic,passport',
            'ic_passport_no'    => 'nullable|string|max:50',

            'bank_name'         => 'nullable|string|max:100',
            'bank_account_name' => 'nullable|string|max:150',
            'bank_account_no'   => 'nullable|string|max:50',

            'gender'            => 'nullable|in:male,female,other',
            'dob'               => 'nullable|date',

            'status'            => 'nullable|in:active,inactive',
        ]);
    }

    private function generateCode(): string
    {
        $last = Employee::orderByRaw("CAST(SUBSTRING(employee_code FROM 4) AS INTEGER) DESC")->first();
        $next = $last ? ((int) substr($last->employee_code, 3)) + 1 : 1;
        return 'EMP' . str_pad($next, 3, '0', STR_PAD_LEFT);
    }
}
