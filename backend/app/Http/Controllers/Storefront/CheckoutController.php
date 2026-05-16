<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\CRM\Customer;
use App\Services\Storefront\CartService;
use App\Services\Storefront\CheckoutService;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private CheckoutService $checkoutService,
    ) {}

    public function placeOrder(Request $request)
    {
        $data = $request->validate([
            'shipping_address.name'       => 'required|string|max:120',
            'shipping_address.phone'      => 'required|string|max:30',
            'shipping_address.line1'      => 'required|string|max:160',
            'shipping_address.line2'      => 'nullable|string|max:160',
            'shipping_address.city'       => 'required|string|max:80',
            'shipping_address.state_code' => 'required|string|max:8',
            'shipping_address.postcode'   => 'required|string|max:10',
            'shipping_address.country'    => 'nullable|string|max:2',
            'billing_address'             => 'nullable|array',
            'payment_method'              => 'required|in:cod,bank_transfer,stripe,paypal,billplz,toyyibpay',
            'guest_email'                 => 'nullable|email',
            'guest_name'                  => 'nullable|string',
            'guest_password'              => 'nullable|string|min:8',
        ]);

        $cart = $this->cartService->findOrCreate(
            $request->header('X-Cart-Token'),
            $request->user('customer'),
        );

        if ($cart->items()->count() === 0) {
            return response()->json(['error' => 'Cart is empty.'], 422);
        }

        // Guest checkout: auto-create customer if email/password provided
        $customer = $request->user('customer');
        if (!$customer && !empty($data['guest_email']) && !empty($data['guest_password'])) {
            $customer = Customer::firstOrCreate(
                ['email' => $data['guest_email']],
                [
                    'name'      => $data['guest_name'] ?? $data['shipping_address']['name'],
                    'phone'     => $data['shipping_address']['phone'],
                    'password'  => $data['guest_password'],
                    'is_active' => true,
                ],
            );
            $cart->update(['customer_id' => $customer->id]);
        }

        $payload = [
            'shipping_address' => $data['shipping_address'],
            'billing_address'  => $data['billing_address'] ?? $data['shipping_address'],
            'payment_method'   => $data['payment_method'],
            'customer_id'      => $customer?->id,
        ];

        $order = $this->checkoutService->place($cart, $payload);

        return response()->json([
            'order_id'   => $order->id,
            'so_number'  => $order->so_number,
            'amount'     => $order->amount,
            'status'     => $order->storefront_status,
            'next_step'  => $this->nextStepFor($order->payment_method),
        ]);
    }

    private function nextStepFor(string $paymentMethod): array
    {
        return match ($paymentMethod) {
            'cod'           => ['type' => 'thank_you', 'message' => 'Order placed. We will contact you to confirm Cash on Delivery.'],
            'bank_transfer' => ['type' => 'thank_you', 'message' => 'Order placed. Bank transfer instructions will be emailed shortly.'],
            default         => ['type' => 'thank_you', 'message' => 'Order placed.'],
        };
    }
}
