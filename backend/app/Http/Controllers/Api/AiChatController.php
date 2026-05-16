<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\AI\AiChatConversation;
use App\Models\HRM\Employee;
use App\Models\HRM\EmployeePreference;
use App\Services\AI\AiChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiChatController extends Controller
{
    use ApiResponse;

    public function __construct(private AiChatService $chat)
    {
    }

    /**
     * GET /api/ai-chat/conversations?employee_id=...
     */
    public function listConversations(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        $convs = AiChatConversation::where('employee_id', $request->employee_id)
            ->orderByDesc('last_message_at')
            ->paginate(30);
        return $this->paginated($convs);
    }

    /**
     * GET /api/ai-chat/conversations/{conv}
     */
    public function show(AiChatConversation $conversation): JsonResponse
    {
        return $this->success($conversation->load(['messages', 'task:id,title']));
    }

    /**
     * POST /api/ai-chat/conversations
     * Body: employee_id, task_id?
     */
    public function startConversation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'task_id'     => 'nullable|exists:tasks,id',
        ]);
        $prefs = EmployeePreference::firstOrCreate(['employee_id' => $data['employee_id']]);

        $conv = AiChatConversation::create([
            'employee_id'     => $data['employee_id'],
            'task_id'         => $data['task_id'] ?? null,
            'language'        => $prefs->preferred_language,
            'last_message_at' => now(),
        ]);

        // If first-ever conversation and no language picked, seed an assistant message asking language.
        if (!$prefs->preferred_language) {
            $conv->messages()->create([
                'role'    => 'assistant',
                'content' => "Hello! Which language would you prefer for our conversation? (English / Urdu / Roman Urdu / Punjabi / Arabic / Malay / Chinese — or any other language)",
            ]);
        }

        return $this->success($conv->load('messages'), 'Conversation started', 201);
    }

    /**
     * POST /api/ai-chat/conversations/{conv}/message
     * Body: content
     */
    public function sendMessage(Request $request, AiChatConversation $conversation): JsonResponse
    {
        $request->validate(['content' => 'required|string']);
        $result = $this->chat->send($conversation, $request->content);
        return $this->success([
            'reply'        => $result['reply'],
            'message'      => $result['message'],
            'conversation' => $result['conversation']->fresh(),
        ], 'OK');
    }

    /**
     * POST /api/ai-chat/preferences/language
     * Body: employee_id, language
     */
    public function setLanguage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'language'    => 'required|string|max:60',
        ]);
        $prefs = EmployeePreference::firstOrCreate(['employee_id' => $data['employee_id']]);
        $prefs->update(['preferred_language' => $data['language']]);
        return $this->success($prefs, 'Language saved');
    }

    /**
     * GET /api/ai-chat/reports/employee/{employee}
     */
    public function employeeReport(Employee $employee): JsonResponse
    {
        $convs = AiChatConversation::with('messages')
            ->where('employee_id', $employee->id)
            ->orderByDesc('last_message_at')
            ->get();
        return $this->success([
            'employee'      => $employee->only(['id', 'name', 'employee_code']),
            'conversations' => $convs,
            'total_tokens'  => $convs->sum(fn($c) => $c->messages->sum('tokens_in') + $c->messages->sum('tokens_out')),
        ]);
    }

    /**
     * GET /api/ai-chat/reports/task/{task}
     */
    public function taskReport(\App\Models\Projects\Task $task): JsonResponse
    {
        $convs = AiChatConversation::with(['messages', 'employee:id,name'])
            ->where('task_id', $task->id)
            ->get();
        return $this->success([
            'task'          => $task->only(['id', 'title', 'status']),
            'conversations' => $convs,
        ]);
    }
}
