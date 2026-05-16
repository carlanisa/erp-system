<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    use ApiResponse;

    public function index(Request $r): JsonResponse
    {
        $q = Activity::with(['type','customer','lead'])
            ->when($r->customer_id, fn($qq) => $qq->where('customer_id', $r->customer_id))
            ->when($r->lead_id, fn($qq) => $qq->where('lead_id', $r->lead_id))
            ->when($r->from, fn($qq) => $qq->whereDate('scheduled_at','>=', $r->from))
            ->when($r->to, fn($qq) => $qq->whereDate('scheduled_at','<=', $r->to))
            ->orderByDesc('scheduled_at');

        return $this->paginated($q->paginate((int) ($r->per_page ?? 20)));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'activity_type_id' => 'nullable|exists:crm_activity_types,id',
            'customer_id' => 'nullable|exists:customers,id',
            'lead_id' => 'nullable|exists:crm_leads,id',
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'outcome' => 'nullable|string|max:32',
        ]);
        return $this->success(Activity::create($data)->load(['type','customer','lead']), 'Created', 201);
    }

    public function update(Request $r, Activity $activity): JsonResponse
    {
        $activity->update($r->validate([
            'activity_type_id' => 'nullable|exists:crm_activity_types,id',
            'customer_id' => 'nullable|exists:customers,id',
            'lead_id' => 'nullable|exists:crm_leads,id',
            'subject' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'outcome' => 'nullable|string|max:32',
        ]));
        return $this->success($activity, 'Updated');
    }

    public function destroy(Activity $activity): JsonResponse
    {
        $activity->delete();
        return $this->success(null, 'Deleted');
    }
}
