<?php

namespace App\Http\Controllers\Api\HRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\Employee;
use App\Models\HRM\LeaveRequest;
use App\Models\HRM\LeaveType;
use App\Services\HRM\LeaveMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    use ApiResponse;

    public function __construct(private LeaveMailer $mailer) {}

    public function index(Request $request): JsonResponse
    {
        $leaves = LeaveRequest::with(['employee:id,employee_code,name,department,email', 'leaveType:id,code,name,color'])
            ->when($request->status,      fn($q) => $q->where('status', $request->status))
            ->when($request->employee_id, fn($q) => $q->where('employee_id', $request->employee_id))
            ->latest()
            ->paginate(20);

        return $this->paginated($leaves);
    }

    public function show(LeaveRequest $leave): JsonResponse
    {
        return $this->success($leave->load(['employee', 'leaveType', 'approver:id,name']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $leaveTypeCode = null;
        if (!empty($data['leave_type_id'])) {
            $leaveTypeCode = LeaveType::where('id', $data['leave_type_id'])->value('code');
        }

        $leave = LeaveRequest::create([
            ...$data,
            'type'         => $data['type'] ?? ($leaveTypeCode ? strtolower($leaveTypeCode) : 'annual'),
            'status'       => 'pending',
            'source'       => $data['source'] ?? 'admin',
            'is_emergency' => $data['is_emergency'] ?? false,
        ]);

        // Best-effort notification
        $this->mailer->submitted($leave);

        return $this->success(
            $leave->load(['employee', 'leaveType']),
            "Leave request for {$leave->days} day(s) submitted",
            201
        );
    }

    public function approve(Request $request, LeaveRequest $leave): JsonResponse
    {
        if ($leave->status !== 'pending') {
            return $this->error('Leave request already processed', 422);
        }
        $data = $request->validate([
            'admin_notes' => 'nullable|string',
            'send_email'  => 'sometimes|boolean',
        ]);

        $leave->update([
            'status'      => 'approved',
            'admin_notes' => $data['admin_notes'] ?? null,
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        if (($data['send_email'] ?? true) === true) {
            $this->mailer->approved($leave);
        }

        return $this->success($leave->load(['employee', 'leaveType']), 'Leave approved');
    }

    public function reject(Request $request, LeaveRequest $leave): JsonResponse
    {
        if ($leave->status !== 'pending') {
            return $this->error('Leave request already processed', 422);
        }
        $data = $request->validate([
            'admin_notes' => 'nullable|string',
            'send_email'  => 'sometimes|boolean',
        ]);

        $leave->update([
            'status'      => 'rejected',
            'admin_notes' => $data['admin_notes'] ?? null,
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        if (($data['send_email'] ?? true) === true) {
            $this->mailer->rejected($leave);
        }

        return $this->success($leave->load(['employee', 'leaveType']), 'Leave rejected');
    }

    /**
     * Admin marks that the employee has replied / acknowledged
     * the decision email. Optional response_notes captures what they said.
     */
    public function markReplied(Request $request, LeaveRequest $leave): JsonResponse
    {
        $data = $request->validate([
            'response_notes' => 'nullable|string|max:2000',
            'replied'        => 'sometimes|boolean',
        ]);

        $replied = $data['replied'] ?? true;

        $leave->update([
            'employee_replied_at' => $replied ? now() : null,
            'response_notes'      => $data['response_notes'] ?? $leave->response_notes,
        ]);

        return $this->success($leave->load(['employee', 'leaveType']),
            $replied ? 'Marked as replied' : 'Reply mark cleared');
    }

    /**
     * PUBLIC — staff submits leave from a public form using their
     * employee_code + email for verification (no auth token required).
     */
    public function publicApply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_code'        => 'required|string|max:30',
            'email'                => 'required|email|max:120',
            'leave_type_id'        => 'nullable|exists:hrm_leave_types,id',
            'from_date'            => 'required|date',
            'to_date'              => 'required|date|after_or_equal:from_date',
            'reason_category'      => 'nullable|string|max:60',
            'reason'               => 'required|string|min:5|max:5000',
            'contact_during_leave' => 'nullable|string|max:50',
            'address_during_leave' => 'nullable|string|max:500',
            'handover_person'      => 'nullable|string|max:120',
            'handover_notes'       => 'nullable|string|max:2000',
            'is_emergency'         => 'sometimes|boolean',
        ]);

        // Verify employee exists and email matches
        $employee = Employee::where('employee_code', $data['employee_code'])
            ->where('status', 'active')
            ->first();

        if (!$employee || strcasecmp((string) $employee->email, $data['email']) !== 0) {
            return $this->error(
                'Could not verify your identity. Please check your employee code and the email on file.',
                422
            );
        }

        $leaveTypeCode = !empty($data['leave_type_id'])
            ? LeaveType::where('id', $data['leave_type_id'])->value('code')
            : null;

        $leave = LeaveRequest::create([
            ...$data,
            'employee_id'  => $employee->id,
            'type'         => $leaveTypeCode ? strtolower($leaveTypeCode) : 'annual',
            'status'       => 'pending',
            'source'       => 'public',
            'is_emergency' => $data['is_emergency'] ?? false,
        ]);

        // Notify HR + send confirmation to employee
        $this->mailer->submitted($leave);

        return $this->success(
            [
                'id'         => $leave->id,
                'days'       => $leave->days,
                'employee'   => ['name' => $employee->name, 'code' => $employee->employee_code],
                'from_date'  => $leave->from_date->format('Y-m-d'),
                'to_date'    => $leave->to_date->format('Y-m-d'),
                'status'     => 'pending',
                'submitted'  => now()->format('d M Y, h:i A'),
            ],
            "Leave request for {$leave->days} day(s) submitted. You will receive an email confirmation shortly.",
            201
        );
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'employee_id'          => 'required|exists:employees,id',
            'leave_type_id'        => 'nullable|exists:hrm_leave_types,id',
            'type'                 => 'nullable|string|max:30',
            'from_date'            => 'required|date',
            'to_date'              => 'required|date|after_or_equal:from_date',
            'reason_category'      => 'nullable|string|max:60',
            'reason'               => 'nullable|string|max:5000',
            'contact_during_leave' => 'nullable|string|max:50',
            'address_during_leave' => 'nullable|string|max:500',
            'handover_person'      => 'nullable|string|max:120',
            'handover_notes'       => 'nullable|string|max:2000',
            'is_emergency'         => 'sometimes|boolean',
            'source'               => 'sometimes|in:admin,employee,public',
        ]);
    }
}
