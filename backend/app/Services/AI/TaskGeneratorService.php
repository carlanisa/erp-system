<?php

namespace App\Services\AI;

use App\Models\HRM\JobDescription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Given a JobDescription, ask Claude to produce a starter set of tasks
 * (onboarding, recurring routines, role-specific duties). Returns array
 * of task suggestions for manager review before they are saved.
 */
class TaskGeneratorService
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = (string) config('services.anthropic.api_key', '');
        $this->model  = (string) config('services.anthropic.model', 'claude-sonnet-4-5-20250929');
    }

    public function isConfigured(): bool
    {
        return $this->apiKey !== '';
    }

    /**
     * @return array{ok: bool, message: string, data: array<int, array<string, mixed>>}
     */
    public function generate(JobDescription $jd): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok'      => false,
                'message' => 'ANTHROPIC_API_KEY missing — using fallback starter tasks.',
                'data'    => $this->fallback($jd),
            ];
        }

        $resp = json_encode($jd->responsibilities ?? [], JSON_UNESCAPED_UNICODE);
        $kpis = json_encode($jd->kpis ?? [], JSON_UNESCAPED_UNICODE);
        $designation = optional($jd->designation)->title ?? $jd->title;

        $prompt = <<<PROMPT
You are an HR operations specialist for a Malaysian retail / fashion ERP business. Given a job description, produce a starter task list that the new hire should do.

JOB DESCRIPTION:
- Role: $designation
- Title: {$jd->title}
- Summary: {$jd->description}
- Responsibilities: $resp
- KPIs: $kpis

REQUIREMENTS:
- Mix of: (a) onboarding tasks for first 1-7 days, (b) daily/weekly recurring duties, (c) role-specific outputs / KPIs the hire is responsible for.
- 7 to 12 tasks total.
- Keep titles short, action-oriented.
- All task titles and descriptions MUST be in English.

Return ONLY a valid JSON array (no markdown), where each item has these keys:
[
  {
    "title": string (short imperative, e.g. "Submit daily sales report"),
    "description": string (1-3 sentences explaining what + why),
    "priority": "high" | "medium" | "low",
    "recurrence": "none" | "daily" | "weekly" | "monthly",
    "due_offset_days": integer (days from start date; 0 = day 1; for recurring tasks use 0)
  }
]
PROMPT;

        try {
            $response = Http::timeout(60)
                ->withHeaders([
                    'x-api-key'         => $this->apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type'      => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model'      => $this->model,
                    'max_tokens' => 2500,
                    'messages'   => [['role' => 'user', 'content' => $prompt]],
                ]);

            if (!$response->successful()) {
                Log::warning('TaskGenerator API error', ['status' => $response->status(), 'body' => $response->body()]);
                return ['ok' => false, 'message' => 'Claude API ' . $response->status(), 'data' => $this->fallback($jd)];
            }

            $text = $response->json('content.0.text', '');
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', trim($text));
            $json = json_decode($text, true);

            if (!is_array($json)) {
                return ['ok' => false, 'message' => 'Claude returned non-JSON.', 'data' => $this->fallback($jd)];
            }

            return ['ok' => true, 'message' => 'AI tasks generated', 'data' => $json];
        } catch (\Throwable $e) {
            Log::error('TaskGenerator exception', ['err' => $e->getMessage()]);
            return ['ok' => false, 'message' => $e->getMessage(), 'data' => $this->fallback($jd)];
        }
    }

    private function fallback(JobDescription $jd): array
    {
        return [
            ['title' => 'Complete HR onboarding paperwork', 'description' => 'Submit bank details, EPF/SOCSO, IC copy, and emergency contact information.', 'priority' => 'high', 'recurrence' => 'none', 'due_offset_days' => 1],
            ['title' => 'Get system access', 'description' => 'Coordinate with IT to set up ERP login, email, and the attendance app.', 'priority' => 'high', 'recurrence' => 'none', 'due_offset_days' => 1],
            ['title' => 'Meet team & shadow', 'description' => 'Shadow senior staff for the first three days to learn workflows.', 'priority' => 'medium', 'recurrence' => 'none', 'due_offset_days' => 3],
            ['title' => 'Daily attendance check-in', 'description' => 'Mark attendance via the ERP app every morning.', 'priority' => 'high', 'recurrence' => 'daily', 'due_offset_days' => 0],
            ['title' => 'Weekly progress review', 'description' => 'Weekly review meeting with the manager.', 'priority' => 'medium', 'recurrence' => 'weekly', 'due_offset_days' => 7],
        ];
    }
}
