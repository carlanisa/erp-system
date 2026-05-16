<?php

namespace App\Http\Controllers\Api\Sales\OrderManagement;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Inventory\Product;
use App\Models\Inventory\ProductVariant;
use App\Models\Marketplace\MarketplaceOrder;
use App\Models\Marketplace\MarketplaceReturn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketplaceReturnController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $rows = MarketplaceReturn::with(['order.channel', 'order.items'])
            ->when($request->status, fn($q,$s) => $q->where('status', $s))
            ->latest('id')
            ->paginate($request->per_page ?: 25);
        return response()->json([
            'success' => true,
            'data'    => $rows->items(),
            'meta'    => [
                'current_page' => $rows->currentPage(),
                'last_page'    => $rows->lastPage(),
                'total'        => $rows->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|integer|exists:marketplace_orders,id',
            'reason'   => 'nullable|string',
        ]);
        $order = MarketplaceOrder::findOrFail($data['order_id']);
        $order->update(['status' => 'return_requested']);
        $ret = MarketplaceReturn::create([
            'marketplace_order_id' => $order->id,
            'status' => 'requested',
            'reason' => $data['reason'] ?? null,
        ]);
        return $this->success($ret, 'Return requested', 201);
    }

    public function receive(Request $request, $id): JsonResponse
    {
        $ret = MarketplaceReturn::with('order.items.variant', 'order.items.product')->findOrFail($id);
        $data = $request->validate([
            'condition' => 'required|in:saleable,damaged',
            'notes'     => 'nullable|string',
        ]);
        $ret->update([
            'status'      => 'received',
            'condition'   => $data['condition'],
            'notes'       => $data['notes'] ?? null,
            'received_at' => now(),
            'processed_by'=> $request->user()?->id,
        ]);
        $ret->order->update(['status' => 'returned']);
        return $this->success($ret->fresh('order'));
    }

    public function refund(Request $request, $id): JsonResponse
    {
        $ret = MarketplaceReturn::with('order.items.variant', 'order.items.product')->findOrFail($id);
        $data = $request->validate([
            'refund_amount' => 'required|numeric|min:0',
            'restock'       => 'boolean',
        ]);

        DB::transaction(function () use ($ret, $data) {
            if (!empty($data['restock']) && $ret->condition === 'saleable') {
                foreach ($ret->order->items as $it) {
                    if ($it->variant) {
                        $it->variant->increment('stock', $it->qty);
                    } elseif ($it->product) {
                        $it->product->increment('stock', $it->qty);
                    }
                }
                $ret->restocked = true;
            }
            $ret->refund_amount = $data['refund_amount'];
            $ret->status = 'refunded';
            $ret->refunded_at = now();
            $ret->save();
            $ret->order->update(['status' => 'refunded']);
        });

        return $this->success($ret->fresh('order'), 'Refund processed');
    }
}
