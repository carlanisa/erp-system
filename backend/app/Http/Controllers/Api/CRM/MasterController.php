<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CRM\ActivityType;
use App\Models\CRM\CustomerGroup;
use App\Models\CRM\FollowUpRule;
use App\Models\CRM\LeadSource;
use App\Models\CRM\LoyaltyTier;
use App\Models\CRM\MessageTemplate;
use App\Models\CRM\PipelineStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MasterController extends Controller
{
    use ApiResponse;

    // ── Lead Sources ──
    public function indexSources(): JsonResponse  { return $this->success(LeadSource::orderBy('sort_order')->orderBy('name')->get()); }
    public function storeSource(Request $r): JsonResponse {
        $data = $r->validate(['code'=>'required|string|max:32|unique:crm_lead_sources','name'=>'required|string|max:255','color'=>'nullable|string|max:32','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        return $this->success(LeadSource::create($data), 'Created', 201);
    }
    public function updateSource(Request $r, LeadSource $source): JsonResponse {
        $data = $r->validate(['code'=>'sometimes|string|max:32|unique:crm_lead_sources,code,'.$source->id,'name'=>'sometimes|string|max:255','color'=>'nullable|string|max:32','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        $source->update($data);
        return $this->success($source, 'Updated');
    }
    public function destroySource(LeadSource $source): JsonResponse {
        $source->delete();
        return $this->success(null, 'Deleted');
    }

    // ── Pipeline Stages ──
    public function indexStages(): JsonResponse { return $this->success(PipelineStage::orderBy('sort_order')->get()); }
    public function storeStage(Request $r): JsonResponse {
        $data = $r->validate(['name'=>'required|string|max:255','color'=>'nullable|string|max:32','win_probability'=>'nullable|numeric|min:0|max:100','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']);
        return $this->success(PipelineStage::create($data), 'Created', 201);
    }
    public function updateStage(Request $r, PipelineStage $stage): JsonResponse {
        $stage->update($r->validate(['name'=>'sometimes|string|max:255','color'=>'nullable|string|max:32','win_probability'=>'nullable|numeric|min:0|max:100','sort_order'=>'nullable|integer','is_active'=>'nullable|boolean']));
        return $this->success($stage, 'Updated');
    }
    public function destroyStage(PipelineStage $stage): JsonResponse { $stage->delete(); return $this->success(null, 'Deleted'); }

    // ── Customer Groups ──
    public function indexGroups(): JsonResponse { return $this->success(CustomerGroup::orderBy('name')->get()); }
    public function storeGroup(Request $r): JsonResponse {
        $data = $r->validate(['code'=>'required|string|max:32|unique:crm_customer_groups','name'=>'required|string|max:255','color'=>'nullable|string|max:32','default_discount_pct'=>'nullable|numeric|min:0|max:100','credit_days'=>'nullable|integer|min:0','is_active'=>'nullable|boolean']);
        return $this->success(CustomerGroup::create($data), 'Created', 201);
    }
    public function updateGroup(Request $r, CustomerGroup $group): JsonResponse {
        $group->update($r->validate(['code'=>'sometimes|string|max:32|unique:crm_customer_groups,code,'.$group->id,'name'=>'sometimes|string|max:255','color'=>'nullable|string|max:32','default_discount_pct'=>'nullable|numeric|min:0|max:100','credit_days'=>'nullable|integer|min:0','is_active'=>'nullable|boolean']));
        return $this->success($group, 'Updated');
    }
    public function destroyGroup(CustomerGroup $group): JsonResponse { $group->delete(); return $this->success(null, 'Deleted'); }

    // ── Loyalty Tiers ──
    public function indexTiers(): JsonResponse { return $this->success(LoyaltyTier::orderBy('threshold_amount')->get()); }
    public function storeTier(Request $r): JsonResponse {
        $data = $r->validate(['name'=>'required|string|max:255','threshold_amount'=>'nullable|numeric|min:0','points_multiplier'=>'nullable|numeric|min:0','color'=>'nullable|string|max:32','perks'=>'nullable|string','is_active'=>'nullable|boolean']);
        return $this->success(LoyaltyTier::create($data), 'Created', 201);
    }
    public function updateTier(Request $r, LoyaltyTier $tier): JsonResponse {
        $tier->update($r->validate(['name'=>'sometimes|string|max:255','threshold_amount'=>'nullable|numeric|min:0','points_multiplier'=>'nullable|numeric|min:0','color'=>'nullable|string|max:32','perks'=>'nullable|string','is_active'=>'nullable|boolean']));
        return $this->success($tier, 'Updated');
    }
    public function destroyTier(LoyaltyTier $tier): JsonResponse { $tier->delete(); return $this->success(null, 'Deleted'); }

    // ── Activity Types ──
    public function indexActTypes(): JsonResponse { return $this->success(ActivityType::orderBy('name')->get()); }
    public function storeActType(Request $r): JsonResponse {
        $data = $r->validate(['code'=>'required|string|max:32|unique:crm_activity_types','name'=>'required|string|max:255','color'=>'nullable|string|max:32','is_active'=>'nullable|boolean']);
        return $this->success(ActivityType::create($data), 'Created', 201);
    }
    public function updateActType(Request $r, ActivityType $activityType): JsonResponse {
        $activityType->update($r->validate(['code'=>'sometimes|string|max:32|unique:crm_activity_types,code,'.$activityType->id,'name'=>'sometimes|string|max:255','color'=>'nullable|string|max:32','is_active'=>'nullable|boolean']));
        return $this->success($activityType, 'Updated');
    }
    public function destroyActType(ActivityType $activityType): JsonResponse { $activityType->delete(); return $this->success(null, 'Deleted'); }

    // ── Follow-up Rules ──
    public function indexRules(): JsonResponse { return $this->success(FollowUpRule::orderBy('title')->get()); }
    public function storeRule(Request $r): JsonResponse {
        $data = $r->validate(['title'=>'required|string|max:255','trigger'=>'required|string|max:64','days_offset'=>'nullable|integer','channel'=>'required|in:whatsapp,sms,email,task','template'=>'nullable|string','is_active'=>'nullable|boolean']);
        return $this->success(FollowUpRule::create($data), 'Created', 201);
    }
    public function updateRule(Request $r, FollowUpRule $rule): JsonResponse {
        $rule->update($r->validate(['title'=>'sometimes|string|max:255','trigger'=>'sometimes|string|max:64','days_offset'=>'nullable|integer','channel'=>'sometimes|in:whatsapp,sms,email,task','template'=>'nullable|string','is_active'=>'nullable|boolean']));
        return $this->success($rule, 'Updated');
    }
    public function destroyRule(FollowUpRule $rule): JsonResponse { $rule->delete(); return $this->success(null, 'Deleted'); }

    // ── Message Templates ──
    public function indexTemplates(): JsonResponse { return $this->success(MessageTemplate::orderBy('name')->get()); }
    public function storeTemplate(Request $r): JsonResponse {
        $data = $r->validate(['code'=>'required|string|max:64|unique:crm_message_templates','name'=>'required|string|max:255','channel'=>'required|in:whatsapp,sms,email','body'=>'required|string','is_active'=>'nullable|boolean']);
        return $this->success(MessageTemplate::create($data), 'Created', 201);
    }
    public function updateTemplate(Request $r, MessageTemplate $template): JsonResponse {
        $template->update($r->validate(['code'=>'sometimes|string|max:64|unique:crm_message_templates,code,'.$template->id,'name'=>'sometimes|string|max:255','channel'=>'sometimes|in:whatsapp,sms,email','body'=>'sometimes|string','is_active'=>'nullable|boolean']));
        return $this->success($template, 'Updated');
    }
    public function destroyTemplate(MessageTemplate $template): JsonResponse { $template->delete(); return $this->success(null, 'Deleted'); }
}
