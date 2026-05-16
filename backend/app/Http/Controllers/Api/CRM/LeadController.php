<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    use ApiResponse;

    public function index(Request $r): JsonResponse
    {
        $q = Lead::with(['source','stage','customer'])
            ->when($r->search, fn($qq) => $qq->where(fn($w) =>
                $w->where('name','like',"%{$r->search}%")
                  ->orWhere('phone','like',"%{$r->search}%")
                  ->orWhere('email','like',"%{$r->search}%")))
            ->when($r->stage_id, fn($qq) => $qq->where('stage_id', $r->stage_id))
            ->when($r->source_id, fn($qq) => $qq->where('source_id', $r->source_id))
            ->when($r->status, fn($qq) => $qq->where('status', $r->status))
            ->orderByDesc('id');

        return $this->paginated($q->paginate((int) ($r->per_page ?? 20)));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email',
            'source_id' => 'nullable|exists:crm_lead_sources,id',
            'stage_id' => 'nullable|exists:crm_pipeline_stages,id',
            'owner_user_id' => 'nullable|exists:users,id',
            'customer_id' => 'nullable|exists:customers,id',
            'expected_value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
            'status' => 'nullable|in:open,won,lost',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        return $this->success(Lead::create($data)->load(['source','stage']), 'Created', 201);
    }

    public function show(Lead $lead): JsonResponse
    {
        return $this->success($lead->load(['source','stage','customer']));
    }

    public function update(Request $r, Lead $lead): JsonResponse
    {
        $data = $r->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email',
            'source_id' => 'nullable|exists:crm_lead_sources,id',
            'stage_id' => 'nullable|exists:crm_pipeline_stages,id',
            'owner_user_id' => 'nullable|exists:users,id',
            'customer_id' => 'nullable|exists:customers,id',
            'expected_value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
            'status' => 'nullable|in:open,won,lost',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        $lead->update($data);
        return $this->success($lead->load(['source','stage']), 'Updated');
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();
        return $this->success(null, 'Deleted');
    }
}
