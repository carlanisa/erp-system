<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\Page;
use App\Models\Storefront\Section;
use App\Models\Storefront\SectionTemplate;
use App\Models\Storefront\ThemeSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SectionTemplatesController extends Controller
{
    public function index()
    {
        return response()->json(SectionTemplate::orderByDesc('id')->get([
            'id', 'name', 'slug', 'description', 'block_count', 'preview_color', 'created_at',
        ]));
    }

    public function show(int $id) { return response()->json(SectionTemplate::findOrFail($id)); }

    /** Save the given page's sections (or specific section_ids) as a re-usable template. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:160',
            'description' => 'nullable|string|max:500',
            'page_id'     => 'nullable|integer',
            'section_ids' => 'nullable|array',
        ]);

        $q = Section::query();
        if (!empty($data['section_ids'])) {
            $q->whereIn('id', $data['section_ids']);
        } elseif (!empty($data['page_id'])) {
            $q->where('page_id', $data['page_id']);
        } else {
            $q->where('page_id', Page::home()->id);
        }
        $blocks = $q->orderBy('position')->get()->map(fn($s) => [
            'type' => $s->type, 'label' => $s->label,
            'enabled' => $s->enabled, 'config_json' => $s->config_json,
        ])->all();

        if (count($blocks) === 0) {
            return response()->json(['message' => 'No sections to save.'], 422);
        }

        $base = Str::slug($data['name']) ?: 'template';
        $slug = $base; $i = 2;
        while (SectionTemplate::where('slug', $slug)->exists()) { $slug = "$base-$i"; $i++; }

        $row = SectionTemplate::create([
            'name'          => $data['name'],
            'slug'          => $slug,
            'description'   => $data['description'] ?? null,
            'blocks_json'   => $blocks,
            'block_count'   => count($blocks),
            'preview_color' => ThemeSetting::current()->color_primary,
            'saved_by'      => optional($request->user())->id,
        ]);
        return response()->json($row, 201);
    }

    /** Append all the template's blocks onto the given page. */
    public function apply(Request $request, int $id)
    {
        $data = $request->validate([
            'page_id' => 'required|integer',
            'mode'    => 'nullable|in:append,replace',
        ]);
        $page = Page::findOrFail($data['page_id']);
        $tpl  = SectionTemplate::findOrFail($id);
        $mode = $data['mode'] ?? 'append';

        DB::transaction(function () use ($tpl, $page, $mode) {
            if ($mode === 'replace') Section::where('page_id', $page->id)->delete();
            $startPos = (Section::where('page_id', $page->id)->max('position') ?? 0) + 1;
            foreach ($tpl->blocks_json as $i => $b) {
                Section::create([
                    'page_id'     => $page->id,
                    'type'        => $b['type'],
                    'label'       => $b['label'] ?? null,
                    'enabled'     => $b['enabled'] ?? true,
                    'position'    => $startPos + $i,
                    'config_json' => $b['config_json'] ?? [],
                ]);
            }
        });
        return response()->json(['ok' => true, 'added' => count($tpl->blocks_json)]);
    }

    public function destroy(int $id)
    {
        SectionTemplate::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }
}
