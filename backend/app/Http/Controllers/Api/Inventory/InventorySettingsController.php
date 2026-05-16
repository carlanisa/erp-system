<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventorySettingsController extends Controller
{
    /**
     * Return all inventory settings as a key→value map grouped by group.
     */
    public function index()
    {
        $rows = DB::table('inventory_settings')->get();
        $map  = [];
        foreach ($rows as $row) {
            $map[$row->key] = $row->value;
        }
        return response()->json(['success' => true, 'data' => $map]);
    }

    /**
     * Bulk-upsert settings.
     * Body: { key: value, ... }  (all strings / castable values)
     */
    public function upsert(Request $request)
    {
        $payload = $request->validate([
            'settings'       => 'required|array',
            'settings.*'     => 'nullable|string|max:2000',
            'group'          => 'nullable|string|max:50',
        ]);

        $group = $payload['group'] ?? 'general';

        foreach ($payload['settings'] as $key => $value) {
            DB::table('inventory_settings')->upsert(
                [['key' => $key, 'value' => $value, 'group' => $group, 'created_at' => now(), 'updated_at' => now()]],
                ['key'],
                ['value', 'group', 'updated_at']
            );
        }

        return response()->json(['success' => true, 'message' => 'Settings saved']);
    }
}
