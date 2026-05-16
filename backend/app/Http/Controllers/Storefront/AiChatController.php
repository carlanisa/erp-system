<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Storefront\AiShopConversation;
use App\Services\AI\StorefrontAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AiChatController extends Controller
{
    public function __construct(private StorefrontAiService $ai) {}

    public function greeting()
    {
        return response()->json($this->ai->greeting());
    }

    public function chat(Request $request)
    {
        $data = $request->validate([
            'message'       => 'required|string|max:1000',
            'session_token' => 'nullable|string|max:64',
            'cart_id'       => 'nullable|integer',
        ]);

        $token = $data['session_token'] ?? $request->header('X-Cart-Token') ?? Str::random(32);

        $conv = AiShopConversation::firstOrCreate(
            ['session_token' => $token],
            [
                'customer_id'   => $request->user('customer')?->id,
                'cart_id'       => $data['cart_id'] ?? null,
                'transcript_json' => [],
                'message_count' => 0,
            ],
        );

        $result = $this->ai->chat($conv, $data['message']);

        return response()->json([
            'message'       => $result['message'],
            'quick_replies' => $result['quick_replies'],
            'ui_actions'    => $result['ui_actions'],
            'session_token' => $token,
        ]);
    }
}
