<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'company'  => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'company'  => $data['company'] ?? null,
            'role'     => 'admin',
        ]);

        $token = $user->createToken('erp-token')->plainTextToken;

        return $this->success([
            'user'  => $user,
            'token' => $token,
        ], 'Registration successful', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->two_factor_enabled) {
            $challenge = Str::random(48);
            Cache::put("2fa:challenge:{$challenge}", $user->id, now()->addMinutes(5));

            return $this->success([
                'requires_2fa'    => true,
                'challenge_token' => $challenge,
            ], '2FA required');
        }

        $token = $user->createToken('erp-token')->plainTextToken;

        return $this->success([
            'user'  => $user,
            'token' => $token,
        ], 'Login successful');
    }

    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_token' => 'required|string',
            'code'            => 'required|string|size:6',
        ]);

        $key    = "2fa:challenge:{$data['challenge_token']}";
        $userId = Cache::get($key);
        if (!$userId) {
            return $this->error('Challenge expired or invalid', 422);
        }

        $user = User::find($userId);
        if (!$user || !$user->two_factor_enabled || !$user->two_factor_secret) {
            return $this->error('2FA is not enabled on this account', 422);
        }

        $g = new Google2FA();
        if (!$g->verifyKey($user->two_factor_secret, $data['code'], 2)) {
            return $this->error('Invalid verification code', 422);
        }

        Cache::forget($key);
        $token = $user->createToken('erp-token')->plainTextToken;

        return $this->success([
            'user'  => $user,
            'token' => $token,
        ], 'Login successful');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully');
    }

    public function me(Request $request): JsonResponse
    {
        $u = $request->user();
        $u->setAttribute('permissions', $u->getAllPermissions()->pluck('name')->values());
        return $this->success($u);
    }
}
