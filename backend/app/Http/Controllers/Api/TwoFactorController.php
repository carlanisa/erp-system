<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    use ApiResponse;

    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();
        $g    = new Google2FA();
        $secret = $g->generateSecretKey();

        $user->two_factor_secret = $secret;
        $user->two_factor_enabled = false;
        $user->two_factor_confirmed_at = null;
        $user->save();

        $issuer  = config('app.name', 'ERP');
        $otpauth = $g->getQRCodeUrl($issuer, $user->email, $secret);

        $renderer = new ImageRenderer(new RendererStyle(220), new SvgImageBackEnd());
        $svg = (new Writer($renderer))->writeString($otpauth);
        $qrDataUri = 'data:image/svg+xml;base64,' . base64_encode($svg);

        return $this->success([
            'secret'    => $secret,
            'qr_svg'    => $qrDataUri,
            'otpauth'   => $otpauth,
        ], '2FA setup started');
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();
        if (!$user->two_factor_secret) {
            return $this->error('2FA setup not started', 422);
        }

        $g = new Google2FA();
        if (!$g->verifyKey($user->two_factor_secret, $data['code'], 2)) {
            return $this->error('Invalid verification code', 422);
        }

        $user->two_factor_enabled = true;
        $user->two_factor_confirmed_at = now();
        $user->save();

        return $this->success(['two_factor_enabled' => true], '2FA enabled');
    }

    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string',
            'code'     => 'required|string|size:6',
        ]);

        $user = $request->user();
        if (!Hash::check($data['password'], $user->password)) {
            return $this->error('Incorrect password', 422);
        }

        $g = new Google2FA();
        if (!$user->two_factor_secret || !$g->verifyKey($user->two_factor_secret, $data['code'], 2)) {
            return $this->error('Invalid verification code', 422);
        }

        $user->two_factor_secret = null;
        $user->two_factor_enabled = false;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return $this->success(['two_factor_enabled' => false], '2FA disabled');
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        return $this->success([
            'two_factor_enabled'  => (bool) $user->two_factor_enabled,
            'two_factor_pending'  => $user->two_factor_secret && !$user->two_factor_enabled,
        ]);
    }
}
