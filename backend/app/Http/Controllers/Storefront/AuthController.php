<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\CRM\Customer;
use App\Services\Storefront\CartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private CartService $cartService) {}

    public function register(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:120',
            'email'    => 'required|email|unique:customers,email',
            'phone'    => 'nullable|string|max:30',
            'password' => 'required|string|min:8',
        ]);

        $customer = Customer::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'phone'     => $data['phone'] ?? null,
            'password'  => $data['password'],
            'is_active' => true,
        ]);

        return $this->issueToken($customer, $request);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $customer = Customer::where('email', $data['email'])->first();
        if (!$customer || !Hash::check($data['password'], $customer->password ?? '')) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        return $this->issueToken($customer, $request);
    }

    public function logout(Request $request)
    {
        $request->user('customer')?->currentAccessToken()?->delete();
        return response()->json(['ok' => true]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user('customer'));
    }

    private function issueToken(Customer $customer, Request $request)
    {
        $token = $customer->createToken('storefront')->plainTextToken;

        // Merge guest cart into customer cart on login
        if ($guestToken = $request->header('X-Cart-Token')) {
            $this->cartService->mergeGuestIntoCustomer($guestToken, $customer);
        }

        return response()->json([
            'token'    => $token,
            'customer' => $customer->only(['id', 'name', 'email', 'phone']),
        ]);
    }
}
