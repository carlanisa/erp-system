<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\AiShopConversation;

class AiTranscriptsController extends Controller
{
    public function index()
    {
        return response()->json(
            AiShopConversation::with('customer')
                ->orderByDesc('last_message_at')
                ->paginate(25)
        );
    }

    public function show(int $id)
    {
        return response()->json(AiShopConversation::with('customer')->findOrFail($id));
    }
}
