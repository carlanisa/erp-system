<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * FCM HTTP v1 push notification stub. Wire up the actual service-account auth
 * later — for now logs the payload so the rest of the flow can be tested.
 */
class FcmPusher
{
    private string $serverKey;
    private string $endpoint;

    public function __construct()
    {
        $this->serverKey = (string) config('services.fcm.server_key', '');
        $this->endpoint  = (string) config('services.fcm.endpoint', 'https://fcm.googleapis.com/fcm/send');
    }

    public function push(string $token, string $title, string $body, array $data = []): bool
    {
        if ($this->serverKey === '') {
            Log::info('[FcmPusher stub] no server key — would have pushed', [
                'token' => substr($token, 0, 12) . '…', 'title' => $title, 'body' => $body, 'data' => $data,
            ]);
            return false;
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'key=' . $this->serverKey,
                    'Content-Type'  => 'application/json',
                ])
                ->post($this->endpoint, [
                    'to'           => $token,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data'         => $data,
                ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('FCM push failed', ['err' => $e->getMessage()]);
            return false;
        }
    }
}
