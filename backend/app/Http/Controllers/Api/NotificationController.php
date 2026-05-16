<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\HRM\EmployeePreference;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        $items = Notification::where('employee_id', $request->employee_id)
            ->where('channel', 'in_app')
            ->when($request->unread, fn($q) => $q->whereNull('read_at'))
            ->orderByDesc('id')
            ->paginate(30);
        return $this->paginated($items);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        $count = Notification::where('employee_id', $request->employee_id)
            ->where('channel', 'in_app')
            ->whereNull('read_at')
            ->count();
        return $this->success(['count' => $count]);
    }

    public function markRead(Notification $notification): JsonResponse
    {
        $notification->update(['read_at' => now()]);
        return $this->success($notification, 'Marked read');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        Notification::where('employee_id', $request->employee_id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        return $this->success(null, 'All marked read');
    }

    public function registerPushToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'push_token'  => 'required|string|max:500',
        ]);
        $prefs = EmployeePreference::firstOrCreate(['employee_id' => $data['employee_id']]);
        $prefs->update(['push_token' => $data['push_token']]);
        return $this->success($prefs, 'Push token saved');
    }

    public function preferences(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        $prefs = EmployeePreference::firstOrCreate(['employee_id' => $request->employee_id]);
        return $this->success($prefs);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'         => 'required|exists:employees,id',
            'email_notifications' => 'nullable|boolean',
            'push_notifications'  => 'nullable|boolean',
            'preferred_language'  => 'nullable|string|max:60',
        ]);
        $prefs = EmployeePreference::firstOrCreate(['employee_id' => $data['employee_id']]);
        $prefs->update(collect($data)->except('employee_id')->toArray());
        return $this->success($prefs->fresh(), 'Updated');
    }
}
