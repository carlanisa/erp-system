<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PagesController extends Controller
{
    public function index()
    {
        return response()->json(Page::orderBy('sort_order')->orderBy('title')->get());
    }

    public function show(int $id)
    {
        return response()->json(Page::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'slug'  => 'nullable|string|max:80',
            'meta_title' => 'nullable|string|max:160',
            'meta_description' => 'nullable|string|max:255',
            'is_published' => 'nullable|boolean',
        ]);
        $base = Str::slug($data['slug'] ?? $data['title']);
        if (in_array($base, ['home', 'shop', 'cart', 'checkout', 'account', 'product', 'order'])) {
            return response()->json(['message' => "Slug '$base' is reserved by the storefront."], 422);
        }
        $slug = $base; $i = 2;
        while (Page::where('slug', $slug)->exists()) { $slug = "$base-$i"; $i++; }
        $page = Page::create([
            'slug' => $slug,
            'title' => $data['title'],
            'meta_title' => $data['meta_title'] ?? null,
            'meta_description' => $data['meta_description'] ?? null,
            'is_published' => $data['is_published'] ?? true,
            'sort_order' => (Page::max('sort_order') ?? 0) + 10,
        ]);
        return response()->json($page, 201);
    }

    public function update(Request $request, int $id)
    {
        $page = Page::findOrFail($id);
        $data = $request->validate([
            'title' => 'nullable|string|max:160',
            'meta_title' => 'nullable|string|max:160',
            'meta_description' => 'nullable|string|max:255',
            'is_published' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);
        // Renaming slug requires a separate action to avoid breaking customer-facing links accidentally
        $page->update($data);
        return response()->json($page);
    }

    public function destroy(int $id)
    {
        $page = Page::findOrFail($id);
        if ($page->is_home) {
            return response()->json(['message' => 'Cannot delete the Home page.'], 422);
        }
        $page->delete();
        return response()->json(['ok' => true]);
    }
}
