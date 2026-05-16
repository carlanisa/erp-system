<?php

namespace App\Services\AI;

use App\Models\Storefront\AiShopConversation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Customer-facing shopping concierge with Anthropic tool-use.
 */
class StorefrontAiService
{
    private string $apiKey;
    private string $model;
    private const MAX_TOOL_TURNS = 4;

    public function __construct(private StorefrontAiTools $tools)
    {
        $this->apiKey = (string) config('services.anthropic.api_key', '');
        $this->model  = (string) config('services.anthropic.model', 'claude-sonnet-4-5-20250929');
    }

    public function isConfigured(): bool { return $this->apiKey !== ''; }

    public function chat(AiShopConversation $conv, string $userText): array
    {
        $transcript = $conv->transcript_json ?: [];
        $transcript[] = ['role' => 'user', 'content' => $userText, 'at' => now()->toISOString()];

        $uiActions = [];
        $productCards = [];

        if (!$this->isConfigured()) {
            $reply = "Hello! I'm your shopping assistant. (AI service not configured — please ask the store admin to set ANTHROPIC_API_KEY.)";
        } else {
            [$reply, $uiActions, $productCards] = $this->runToolLoop($transcript, $conv);
        }

        $intent = $this->detectIntent($userText);
        $quickReplies = $this->quickRepliesFor($intent);

        $transcript[] = [
            'role' => 'assistant',
            'content' => $reply,
            'at' => now()->toISOString(),
            'quick_replies' => $quickReplies,
            'product_cards' => $productCards,
            'ui_actions' => $uiActions,
        ];

        $conv->update([
            'transcript_json' => $transcript,
            'last_intent'     => $intent,
            'message_count'   => count($transcript),
            'last_message_at' => now(),
        ]);

        return [
            'message'       => $reply,
            'quick_replies' => $quickReplies,
            'product_cards' => $productCards,
            'ui_actions'    => $uiActions,
            'conversation'  => $conv->fresh(),
        ];
    }

    public function greeting(): array
    {
        return [
            'message' => "Hi! Welcome to our store. Can I help you find something today? What are you looking for?",
            'quick_replies' => ['Baju Kurung', 'Hijab', 'New Arrivals', 'Best Sellers'],
            'product_cards' => [],
            'ui_actions' => [],
        ];
    }

    /**
     * Run the Anthropic tool-use loop. Returns [replyText, uiActions, productCards].
     */
    private function runToolLoop(array $transcript, AiShopConversation $conv): array
    {
        // Anthropic-format messages (role + content)
        $messages = [];
        foreach (array_slice($transcript, -20) as $m) {
            $messages[] = ['role' => $m['role'], 'content' => $m['content']];
        }

        $tools = StorefrontAiTools::schemas();
        $uiActions = [];
        $productCards = [];
        $finalText = '';

        for ($turn = 0; $turn < self::MAX_TOOL_TURNS; $turn++) {
            try {
                $response = Http::timeout(90)
                    ->withHeaders([
                        'x-api-key'         => $this->apiKey,
                        'anthropic-version' => '2023-06-01',
                        'content-type'      => 'application/json',
                    ])
                    ->post('https://api.anthropic.com/v1/messages', [
                        'model'      => $this->model,
                        'max_tokens' => 1024,
                        'system'     => $this->systemPrompt(),
                        'messages'   => $messages,
                        'tools'      => $tools,
                    ]);
            } catch (\Throwable $e) {
                Log::error('StorefrontAi exception', ['err' => $e->getMessage()]);
                return ['Sorry — I could not reach the assistant. Please try again shortly.', [], []];
            }

            if (!$response->successful()) {
                Log::warning('StorefrontAi API error', ['status' => $response->status(), 'body' => $response->body()]);
                return ['Sorry — the assistant is temporarily unavailable.', [], []];
            }

            $data = $response->json();
            $stop = $data['stop_reason'] ?? null;
            $content = $data['content'] ?? [];

            // Collect text + tool_use blocks
            $toolUses = [];
            foreach ($content as $block) {
                if (($block['type'] ?? null) === 'text') {
                    $finalText .= ($finalText ? "\n" : '') . ($block['text'] ?? '');
                } elseif (($block['type'] ?? null) === 'tool_use') {
                    $toolUses[] = $block;
                }
            }

            if ($stop !== 'tool_use' || empty($toolUses)) {
                // Done.
                return [$finalText !== '' ? $finalText : 'How can I help you further?', $uiActions, $productCards];
            }

            // Append assistant message with tool_use
            $messages[] = ['role' => 'assistant', 'content' => $content];

            // Execute each tool and append a single user message with tool_results
            $toolResults = [];
            foreach ($toolUses as $tu) {
                $result = $this->tools->run($tu['name'], $tu['input'] ?? [], $conv);

                // Capture UI hints
                if (isset($result['ui_action'])) $uiActions[] = $result['ui_action'];
                if (isset($result['products']) && is_iterable($result['products'])) {
                    foreach ($result['products'] as $p) $productCards[] = $p;
                }

                $toolResults[] = [
                    'type'        => 'tool_result',
                    'tool_use_id' => $tu['id'],
                    'content'     => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }
            $messages[] = ['role' => 'user', 'content' => $toolResults];
        }

        return [$finalText !== '' ? $finalText : 'Let me know what else I can do.', $uiActions, $productCards];
    }

    private function systemPrompt(): string
    {
        return <<<PROMPT
You are the shopping concierge for a Malaysian modestwear brand selling Baju Kurung, Hijab, and related apparel.

RULES:
- Respond in English ONLY. Even if the customer writes in another language, reply in English.
- Be warm, friendly, concise (2-3 short sentences per turn).
- Greeting flow: ask what they're looking for → category → color → mention size chart → after they show interest in a Baju Kurung, call `suggest_addon` to surface a matching hijab → mention free shipping over RM150 → guide to checkout via `start_checkout`.
- Use tools to act. Never invent SKUs, prices, or stock. Call `list_products` to show options, `get_product` for details, `get_size_chart` for sizing, `add_to_cart` to add an item, `apply_coupon` for codes, `start_checkout` to send them to checkout.
- Shipping: West Malaysia RM8, East Malaysia (Sabah/Sarawak/Labuan) RM18, free over RM150.
- Payments: Cash on Delivery, Bank Transfer, Stripe, PayPal, Billplz, ToyyibPay (whichever the store has enabled).
- After calling tools, summarize the result in one short, friendly sentence so the customer always sees plain text — never reply with tool calls alone.
PROMPT;
    }

    private function detectIntent(string $userText): string
    {
        $u = strtolower($userText);
        if (str_contains($u, 'baju kurung')) return 'category_baju_kurung';
        if (str_contains($u, 'hijab')) return 'category_hijab';
        if (str_contains($u, 'size')) return 'size_help';
        if (str_contains($u, 'ship') || str_contains($u, 'delivery')) return 'shipping_info';
        if (str_contains($u, 'pay') || str_contains($u, 'cod')) return 'payment_info';
        if (str_contains($u, 'coupon') || str_contains($u, 'discount')) return 'coupon_info';
        if (str_contains($u, 'checkout') || str_contains($u, 'buy')) return 'checkout';
        return 'general';
    }

    private function quickRepliesFor(string $intent): array
    {
        return match ($intent) {
            'category_baju_kurung' => ['Show me reds', 'Show me blues', 'Pastel colors', 'Size chart'],
            'category_hijab'       => ['Plain colors', 'Printed', 'Premium silk', 'Bawal style'],
            'size_help'            => ['Show size chart', 'I am size M', 'I am size L'],
            'shipping_info'        => ['I am in West Malaysia', 'I am in Sabah/Sarawak'],
            'payment_info'         => ['COD', 'Bank Transfer', 'Card payment'],
            'checkout'             => ['Go to checkout', 'Apply coupon', 'Continue shopping'],
            default                => ['Baju Kurung', 'Hijab', 'New Arrivals', 'Best Sellers'],
        };
    }
}
