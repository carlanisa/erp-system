<?php

namespace App\Http\Controllers\Api\Sales\OrderManagement;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Marketplace\MarketplaceOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AwbController extends Controller
{
    use ApiResponse;

    /**
     * Orders that are paid/to_ship and have an AWB but no shipped status yet.
     */
    public function pending(Request $request): JsonResponse
    {
        $rows = MarketplaceOrder::with('channel', 'items')
            ->whereIn('status', ['paid', 'to_ship'])
            ->whereNotNull('awb_no')
            ->orderBy('ship_by_date')
            ->get()
            ->map(fn($o) => [
                'id'           => $o->id,
                'awb_no'       => $o->awb_no,
                'courier'      => $o->courier,
                'channel'      => $o->channel?->code,
                'buyer_name'   => $o->buyer_name,
                'ship_by_date' => $o->ship_by_date,
                'has_pdf'      => (bool) $o->awb_pdf_path,
                'item_count'   => $o->items->count(),
                'total'        => (float) $o->total,
            ]);
        return $this->success($rows);
    }

    /**
     * Stream a single order's AWB PDF for browser print preview.
     */
    public function pdf($id)
    {
        $order = MarketplaceOrder::findOrFail($id);
        if (!$order->awb_pdf_path || !Storage::exists($order->awb_pdf_path)) {
            return $this->error('AWB PDF not available', 404);
        }
        return response()->file(Storage::path($order->awb_pdf_path));
    }

    /**
     * Bulk print: returns a JSON list of URLs to print. Frontend opens each in print iframes.
     * For real PDF merging we'd plug setasign/fpdi; for now we return the per-order URLs.
     */
    public function bulkPdf(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:marketplace_orders,id',
        ]);

        $urls = MarketplaceOrder::whereIn('id', $data['ids'])
            ->whereNotNull('awb_pdf_path')
            ->get()
            ->map(fn($o) => [
                'id'  => $o->id,
                'awb' => $o->awb_no,
                'url' => url("/api/sales/order-management/awb/{$o->id}/pdf"),
            ])->values();

        // Mark these as to_ship so they leave the print queue
        MarketplaceOrder::whereIn('id', $data['ids'])
            ->where('status', 'paid')
            ->update(['status' => 'to_ship']);

        return $this->success(['files' => $urls]);
    }
}
