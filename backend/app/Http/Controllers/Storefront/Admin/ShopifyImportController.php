<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShopifyImportSetting;
use App\Services\Shopify\ShopifyImportService;
use Illuminate\Http\Request;

class ShopifyImportController extends Controller
{
    public function __construct(private ShopifyImportService $service) {}

    public function settings()
    {
        $s = ShopifyImportSetting::current();
        return response()->json([
            'shop_domain'         => $s->shop_domain,
            'has_token'           => !empty($s->access_token),
            'masked_token'        => $s->maskedToken(),
            'match_strategy'      => $s->match_strategy,
            'only_missing_images' => $s->only_missing_images,
            'last_synced_at'      => $s->last_synced_at,
            'last_shopify_count'  => $s->last_shopify_count,
            'last_imported_count' => $s->last_imported_count,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'shop_domain'    => 'nullable|string|max:120',
            'access_token'   => 'nullable|string|max:255',
            'match_strategy' => 'nullable|in:sku,handle,name',
            'only_missing_images' => 'nullable|boolean',
        ]);
        $row = ShopifyImportSetting::current();
        // Don't overwrite the existing token if admin left the field blank (so we
        // don't accidentally wipe it on settings re-save).
        if (array_key_exists('access_token', $data) && trim((string) $data['access_token']) === '') {
            unset($data['access_token']);
        }
        $row->update($data);
        return $this->settings();
    }

    public function test()
    {
        $row = ShopifyImportSetting::current();
        return response()->json($this->service->testConnection($row));
    }

    public function scan()
    {
        $row = ShopifyImportSetting::current();
        $total = $this->service->totalCount($row);
        $row->update(['last_shopify_count' => $total]);
        return response()->json(['total' => $total]);
    }

    /** Run one chunk; frontend loops calling this with the returned cursor until done. */
    public function importChunk(Request $request)
    {
        $cursor = $request->query('cursor');
        $row = ShopifyImportSetting::current();
        $result = $this->service->importChunk($row, $cursor);
        $row->update([
            'last_synced_at'      => now(),
            'last_imported_count' => $row->last_imported_count + $result['updated'],
        ]);
        return response()->json($result);
    }

    /** Reset the import counter (used when the user starts a fresh full sync). */
    public function resetCounter()
    {
        ShopifyImportSetting::current()->update(['last_imported_count' => 0]);
        return response()->json(['ok' => true]);
    }
}
