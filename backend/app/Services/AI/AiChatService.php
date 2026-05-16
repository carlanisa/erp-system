<?php

namespace App\Services\AI;

use App\Models\AI\AiChatConversation;
use App\Models\AI\AiChatMessage;
use App\Models\HRM\Employee;
use App\Models\HRM\EmployeePreference;
use App\Models\Projects\Task;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Multilingual AI helper for staff. Asks language preference once,
 * stores it on EmployeePreference, then replies in that language.
 * Optionally context-aware when conversation is linked to a task.
 */
class AiChatService
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
     * Send a user message and get a reply. Persists both messages.
     *
     * @return array{ok: bool, reply: string, conversation: AiChatConversation, message: ?AiChatMessage}
     */
    public function send(AiChatConversation $conv, string $userText): array
    {
        $employee = $conv->employee;
        $prefs = EmployeePreference::firstOrCreate(['employee_id' => $employee->id]);

        // save user message
        $userMsg = AiChatMessage::create([
            'conversation_id' => $conv->id,
            'role'            => 'user',
            'content'         => $userText,
        ]);

        // If no language saved yet AND this looks like a language reply, try to extract.
        if (!$prefs->preferred_language) {
            $lang = $this->extractLanguageFromReply($userText);
            if ($lang) {
                $prefs->update(['preferred_language' => $lang]);
                $conv->update(['language' => $lang]);
            }
        }

        $systemPrompt = $this->buildSystemPrompt($conv, $prefs);

        if (!$this->isConfigured()) {
            $reply = $this->fallbackReply($prefs->preferred_language);
            $asst  = AiChatMessage::create([
                'conversation_id' => $conv->id, 'role' => 'assistant', 'content' => $reply,
            ]);
            $conv->update(['last_message_at' => now()]);
            return ['ok' => false, 'reply' => $reply, 'conversation' => $conv, 'message' => $asst];
        }

        // Build message history (last 20)
        $history = $conv->messages()->orderBy('id')->take(40)->get()
            ->map(fn($m) => ['role' => $m->role === 'system' ? 'user' : $m->role, 'content' => $m->content])
            ->values()->all();

        try {
            $response = Http::timeout(60)
                ->withHeaders([
                    'x-api-key'         => $this->apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type'      => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model'      => $this->model,
                    'max_tokens' => 1200,
                    'system'     => $systemPrompt,
                    'messages'   => $history,
                ]);

            if (!$response->successful()) {
                Log::warning('AiChat API error', ['status' => $response->status(), 'body' => $response->body()]);
                $reply = 'Sorry — AI service temporarily unavailable. (' . $response->status() . ')';
            } else {
                $reply = (string) $response->json('content.0.text', '');
                $usage = $response->json('usage', []);
            }
        } catch (\Throwable $e) {
            Log::error('AiChat exception', ['err' => $e->getMessage()]);
            $reply = 'Sorry — could not reach the AI service. Please try again shortly.';
        }

        $asst = AiChatMessage::create([
            'conversation_id' => $conv->id,
            'role'            => 'assistant',
            'content'         => $reply,
            'tokens_in'       => $usage['input_tokens'] ?? 0,
            'tokens_out'      => $usage['output_tokens'] ?? 0,
        ]);

        $conv->update(['last_message_at' => now()]);
        if (!$conv->title) {
            $conv->update(['title' => mb_substr($userText, 0, 60)]);
        }

        return ['ok' => true, 'reply' => $reply, 'conversation' => $conv, 'message' => $asst];
    }

    /**
     * Build the system prompt — handles the first-time language ask.
     */
    private function buildSystemPrompt(AiChatConversation $conv, EmployeePreference $prefs): string
    {
        $employee = $conv->employee;
        $lang = $prefs->preferred_language;

        $base = "You are a helpful workplace assistant inside an ERP for {$employee->name} (a Malaysian fashion/retail business staff member). Be concise, friendly, practical.";

        if (!$lang) {
            // First-time: ask language
            return $base . "\n\nIMPORTANT: This is the very first interaction and the user has NOT yet picked a language. Greet them in English and ask which language they prefer to chat in (English, Urdu, Roman Urdu, Punjabi, Arabic, Chinese, Malay, or any other). Wait for their reply before answering anything else. Example greeting: 'Hello! Which language would you prefer for our conversation? (English / Urdu / Roman Urdu / Punjabi / Arabic / Malay / Chinese — or any other language)'";
        }

        $sys = $base . "\n\nRespond ONLY in {$lang}. If the user writes in a different language, still reply in {$lang} unless they explicitly switch.";

        if ($conv->task_id && ($task = Task::with('checklist')->find($conv->task_id))) {
            $checklist = $task->checklist->map(fn($c) => '- ' . ($c->is_done ? '[x] ' : '[ ] ') . $c->label)->implode("\n");
            $sys .= "\n\nThe user is currently working on this task — focus your answers on helping them complete it:\n"
                  . "Title: {$task->title}\n"
                  . "Description: " . ($task->description ?? '—') . "\n"
                  . "Priority: {$task->priority}\n"
                  . "Status: {$task->status}\n"
                  . "Due: " . ($task->due_date?->format('Y-m-d') ?? '—') . "\n"
                  . ($checklist ? "Checklist:\n{$checklist}\n" : '');
        }

        return $sys;
    }

    private function extractLanguageFromReply(string $text): ?string
    {
        $text = strtolower(trim($text));
        $map = [
            'urdu'        => 'Urdu',
            'roman urdu'  => 'Roman Urdu',
            'roman-urdu'  => 'Roman Urdu',
            'english'     => 'English',
            'punjabi'     => 'Punjabi',
            'arabic'      => 'Arabic',
            'malay'       => 'Malay',
            'bahasa'      => 'Malay',
            'chinese'     => 'Chinese',
            'mandarin'    => 'Chinese',
            'tamil'       => 'Tamil',
            'hindi'       => 'Hindi',
        ];
        // longest-first match so "roman urdu" beats "urdu"
        uksort($map, fn($a, $b) => strlen($b) <=> strlen($a));
        foreach ($map as $needle => $canonical) {
            if (str_contains($text, $needle)) return $canonical;
        }
        return null;
    }

    private function fallbackReply(?string $lang): string
    {
        if (!$lang) {
            return "Hello! Which language would you prefer for our conversation? (English / Urdu / Roman Urdu / Punjabi / Arabic / Malay / Chinese — or any other language)";
        }
        return "AI service is not yet configured. Please ask the admin to set ANTHROPIC_API_KEY. — (preferred: $lang)";
    }
}
