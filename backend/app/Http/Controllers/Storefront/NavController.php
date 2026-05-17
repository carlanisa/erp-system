<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Menu;
use App\Models\Storefront\PageView;
use Illuminate\Http\Request;

class NavController extends Controller
{
    /** Public — returns all menus + their items keyed by location. */
    public function menus()
    {
        $out = [];
        foreach (Menu::with('items')->get() as $m) {
            $out[$m->location] = $m->items->map(fn($i) => [
                'id'        => $i->id,
                'parent_id' => $i->parent_id,
                'label'     => $i->label,
                'href'      => $i->href,
                'open_new'  => (bool) $i->open_in_new_tab,
                'sort_order'=> $i->sort_order,
            ])->values();
        }
        return response()->json($out);
    }

    /** Public — record a page view. Used by every storefront page. */
    public function track(Request $request)
    {
        $data = $request->validate([
            'page_slug'  => 'required|string|max:80',
            'page_id'    => 'nullable|integer',
            'referrer'   => 'nullable|string|max:500',
            'utm_source' => 'nullable|string|max:60',
            'utm_medium' => 'nullable|string|max:60',
            'utm_campaign' => 'nullable|string|max:80',
        ]);
        PageView::create([
            'page_slug'    => $data['page_slug'],
            'page_id'      => $data['page_id'] ?? null,
            'session_token'=> $request->header('X-Cart-Token'),
            'customer_id'  => optional($request->user('customer'))->id,
            'referrer'     => $data['referrer'] ?? null,
            'utm_source'   => $data['utm_source'] ?? null,
            'utm_medium'   => $data['utm_medium'] ?? null,
            'utm_campaign' => $data['utm_campaign'] ?? null,
            'user_agent'   => substr((string) $request->userAgent(), 0, 255),
            'viewed_at'    => now(),
        ]);
        return response()->json(['ok' => true]);
    }
}
