<?php

namespace App\Http\Controllers\Api\Sales\OrderManagement;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Marketplace\MarketplaceChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $channels = MarketplaceChannel::orderBy('id')->get()->map(fn($c) => [
            'id'             => $c->id,
            'code'           => $c->code,
            'name'           => $c->name,
            'region'         => $c->region,
            'color'          => $c->color,
            'is_active'      => $c->is_active,
            'is_connected'   => $c->is_connected,
            'last_synced_at' => $c->last_synced_at,
        ]);
        return $this->success($channels);
    }

    /**
     * Begin OAuth: returns redirect URL the frontend can open.
     * For Shopee/TikTok this is the partner authorization page.
     * Real credentials must be set in config/services.php first.
     */
    public function oauthRedirect(Request $request, string $code): JsonResponse
    {
        $channel = MarketplaceChannel::where('code', $code)->firstOrFail();
        $partnerId = config("services.{$channel->code}.partner_id");

        if (!$partnerId) {
            return $this->error('Channel partner credentials not configured in services config', 422);
        }

        // Placeholder: real implementations sign a timestamped URL per Shopee/TikTok docs
        $redirect = match (true) {
            str_starts_with($channel->code, 'shopee') => "https://partner.shopeemobile.com/api/v2/shop/auth_partner?partner_id={$partnerId}",
            str_starts_with($channel->code, 'tiktok') => "https://auth.tiktok-shops.com/oauth/authorize?app_key={$partnerId}",
            default => null,
        };

        if (!$redirect) {
            return $this->error('OAuth not supported for this channel', 422);
        }
        return $this->success(['redirect_url' => $redirect]);
    }

    public function oauthCallback(Request $request, string $code): JsonResponse
    {
        $channel = MarketplaceChannel::where('code', $code)->firstOrFail();
        $channel->update([
            'is_connected'   => true,
            'last_synced_at' => now(),
            'credentials'    => array_merge((array) $channel->credentials, [
                'access_token'  => $request->input('access_token', 'sandbox'),
                'refresh_token' => $request->input('refresh_token'),
                'shop_id'       => $request->input('shop_id'),
            ]),
        ]);
        return $this->success(['connected' => true]);
    }

    public function syncNow(string $code): JsonResponse
    {
        $channel = MarketplaceChannel::where('code', $code)->firstOrFail();
        $channel->update(['last_synced_at' => now()]);
        return $this->success(['synced_at' => $channel->last_synced_at]);
    }
}
