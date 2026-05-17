<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Menu;
use App\Models\Storefront\MenuItem;
use Illuminate\Http\Request;

class MenusController extends Controller
{
    public function index()
    {
        return response()->json(Menu::with('items')->get());
    }

    public function storeItem(Request $request, int $menuId)
    {
        $data = $this->itemPayload($request, true);
        $data['menu_id']   = $menuId;
        $data['sort_order'] = $data['sort_order'] ?? ((MenuItem::where('menu_id', $menuId)->max('sort_order') ?? 0) + 1);
        $item = MenuItem::create($data);
        return response()->json($item, 201);
    }

    public function updateItem(Request $request, int $id)
    {
        $item = MenuItem::findOrFail($id);
        $item->update($this->itemPayload($request, false));
        return response()->json($item);
    }

    public function deleteItem(int $id)
    {
        MenuItem::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function reorderItems(Request $request, int $menuId)
    {
        $data = $request->validate(['order' => 'required|array', 'order.*' => 'integer']);
        foreach ($data['order'] as $i => $id) {
            MenuItem::where('menu_id', $menuId)->where('id', $id)->update(['sort_order' => $i]);
        }
        return response()->json(['ok' => true]);
    }

    private function itemPayload(Request $request, bool $creating): array
    {
        return $request->validate([
            'label'           => ($creating ? 'required' : 'nullable') . '|string|max:120',
            'link_type'       => 'nullable|in:page,product,category,custom',
            'link_value'      => 'nullable|string|max:500',
            'open_in_new_tab' => 'nullable|boolean',
            'parent_id'       => 'nullable|integer',
            'sort_order'      => 'nullable|integer',
        ]);
    }
}
