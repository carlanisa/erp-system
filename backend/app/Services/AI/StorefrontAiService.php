<?php

namespace App\Services\AI;

use App\Models\Storefront\AiShopConversation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Customer-facing shopping concierge.
 *
 * Phase 1: stateless greeter + multi-turn chat using Anthropic Claude.
 * Phase 3 will add tool-use (list_products, add_to_cart, etc.).
 */
class StorefrontAiService
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
     * @return array{message:string, quick_replies:array<string>, ui_actions:array, conversation:AiShopConversation}
     */
    public function chat(AiShopConversation $conv, string $userText): array
    {
        $transcript = $conv->transcript_json ?: [];
        $transcript[] = ['role' => 'user', 'content' => $userText, 'at' => now()->toISOString()];

        $quickReplies = [];
        $uiActions = [];

        if (!$this->isConfigured()) {
            $reply = "Hello! I'm your shopping assistant. (AI service not configured — please contact the store admin.)";
        } else {
            $messages = array_values(array_map(
                fn($m) => ['role' => $m['role'], 'content' => $m['content']],
                array_slice($transcript, -20)
            ));

            try {
                $response = Http::timeout(60)
                    ->withHeaders([
                        'x-api-key'         => $this->apiKey,
                        'anthropic-version' => '2023-06-01',
                        'content-type'      => 'application/json',
                    ])
                    ->post('https://api.anthropic.com/v1/messages', [
                        'model'      => $this->model,
                        'max_tokens' => 700,
                        'system'     => $this->systemPrompt(),
                        'messages'   => $messages,
                    ]);
                $reply = $response->successful()
                    ? (string) $response->json('content.0.text', '')
                    : 'Sorry — the assistant is temporarily unavailable. Please try again shortly.';
            } catch (\Throwable $e) {
                Log::error('StorefrontAi exception', ['err' => $e->getMessage()]);
                $reply = 'Sorry — could not reach the assistant. Please try again shortly.';
            }
        }

        // Phase-1 quick replies: derive from intent
        $intent = $this->detectIntent($userText, $reply);
        $quickReplies = $this->quickRepliesFor($intent);

        $transcript[] = [
            'role' => 'assistant',
            'content' => $reply,
            'at' => now()->toISOString(),
            'quick_replies' => $quickReplies,
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
            'ui_actions'    => $uiActions,
            'conversation'  => $conv->fresh(),
        ];
    }

    public function greeting(): array
    {
        return [
            'message' => "Hi! Welcome to our store. Can I help you find something today? What are you looking for?",
            'quick_replies' => ['Baju Kurung', 'Hijab', 'New Arrivals', 'Best Sellers'],
            'ui_actions' => [],
        ];
    }

    private function systemPrompt(): string
    {
        return <<<PROMPT
You are the shopping concierge for a Malaysian modestwear brand selling Baju Kurung, Hijab, and related apparel.

RULES:
- Respond in English ONLY. Even if the customer writes in another language, reply in English.
- Be warm, friendly, concise (2-3 short sentences per turn).
- Greeting flow: ask what they're looking for → ask category (Baju Kurung, Hijab, etc.) → ask color preference → mention the size chart on the product page → suggest a matching hijab after they show interest in a Baju Kurung → mention free shipping for orders over RM150 → guide them to checkout.
- Never invent SKUs, exact prices, or stock levels — say "you can see the latest prices and stock on the product page."
- If the customer asks about shipping: West Malaysia = RM8 flat, East Malaysia (Sabah/Sarawak/Labuan) = RM18 flat, free over RM150.
- If the customer asks about payments: we accept Cash on Delivery, Bank Transfer, and online cards (Phase 2: Stripe/PayPal).
- Keep replies short — this is a chat widget, not an email.
PROMPT;
    }

    private function detectIntent(string $userText, string $reply): string
    {
        $u = strtolower($userText);
        if (str_contains($u, 'baju kurung')) return 'category_baju_kurung';
        if (str_contains($u, 'hijab')) return 'category_hijab';
        if (str_contains($u, 'size')) return 'size_help';
        if (str_contains($u, 'ship') || str_contains($u, 'delivery')) return 'shipping_info';
        if (str_contains($u, 'pay') || str_contains($u, 'cod')) return 'payment_info';
        if (str_contains($u, 'coupon') || str_contains($u, 'discount')) return 'coupon_info';
        return 'general';
    }

    private function quickRepliesFor(string $intent): array
    {
        return match ($intent) {
            'category_baju_kurung' => ['Show me reds', 'Show me blues', 'Pastel colors', 'Size chart'],
            'category_hijab'       => ['Plain colors', 'Printed', 'Premium silk', 'Bawal style'],
            'size_help'            => ['Show size chart', 'I am size M', 'I am size L', 'Custom size'],
            'shipping_info'        => ['I am in West Malaysia', 'I am in Sabah/Sarawak', 'How long delivery?'],
            'payment_info'         => ['COD', 'Bank Transfer', 'Card payment'],
            default                => ['Baju Kurung', 'Hijab', 'New Arrivals', 'Best Sellers'],
        };
    }
}
