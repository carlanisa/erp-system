<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\AnnouncementBar;
use App\Models\Storefront\CustomTheme;
use App\Models\Storefront\Section;
use App\Models\Storefront\ThemeSetting;
use App\Services\Storefront\SceneLibrary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScenesController extends Controller
{
    // ─── Built-in scenes ─────────────────────────────────────────
    public function list()
    {
        // Strip the heavy `sections` arrays — caller will fetch full when applying
        return response()->json(array_map(function ($s) {
            return [
                'code' => $s['code'], 'name' => $s['name'], 'tag' => $s['tag'],
                'description' => $s['description'], 'sample' => $s['sample'],
                'section_count' => count($s['sections']),
            ];
        }, SceneLibrary::all()));
    }

    public function apply(Request $request, string $code)
    {
        $scene = SceneLibrary::byCode($code);
        abort_unless($scene, 404, 'Scene not found.');
        $this->replaceAll($scene['settings'], $scene['sections'], $scene['bar']);
        return response()->json(['ok' => true, 'applied' => $code]);
    }

    // ─── Saved (custom) themes ───────────────────────────────────
    public function customs()
    {
        return response()->json(CustomTheme::orderByDesc('id')->get([
            'id', 'name', 'slug', 'preview_color', 'created_at',
        ]));
    }

    public function saveCurrent(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:120']);
        $settings = ThemeSetting::current()->toArray();
        $sections = Section::orderBy('position')->get()->map(fn($s) => [
            'type' => $s->type, 'label' => $s->label,
            'enabled' => $s->enabled, 'config_json' => $s->config_json,
        ])->all();
        $bar = AnnouncementBar::where('active', true)->orderBy('sort_order')->first();

        $base = Str::slug($data['name']) ?: 'theme';
        $slug = $base; $i = 2;
        while (CustomTheme::where('slug', $slug)->exists()) { $slug = "$base-$i"; $i++; }

        $row = CustomTheme::create([
            'name' => $data['name'],
            'slug' => $slug,
            'settings_json' => $settings,
            'sections_json' => $sections,
            'bar_json'      => $bar?->only(['text','link_url','bg_color','text_color']),
            'preview_color' => $settings['color_primary'] ?? null,
            'saved_by'      => optional($request->user())->id,
        ]);
        return response()->json($row, 201);
    }

    public function applyCustom(int $id)
    {
        $row = CustomTheme::findOrFail($id);
        $this->replaceAll($row->settings_json, $row->sections_json, $row->bar_json);
        return response()->json(['ok' => true, 'applied' => $row->slug]);
    }

    public function deleteCustom(int $id)
    {
        CustomTheme::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // ─── Internal: destructive replace ───────────────────────────
    private function replaceAll(array $settings, array $sections, ?array $bar): void
    {
        DB::transaction(function () use ($settings, $sections, $bar) {
            ThemeSetting::current()->update(collect($settings)->except(['id','created_at','updated_at'])->toArray());

            Section::query()->delete();
            foreach ($sections as $i => $s) {
                Section::create([
                    'type'        => $s['type'],
                    'label'       => $s['label'] ?? null,
                    'position'    => $i + 1,
                    'enabled'     => $s['enabled'] ?? true,
                    'config_json' => $s['config_json'] ?? [],
                ]);
            }

            AnnouncementBar::query()->delete();
            if ($bar) {
                AnnouncementBar::create([
                    'text'       => $bar['text'] ?? '',
                    'link_url'   => $bar['link_url'] ?? null,
                    'bg_color'   => $bar['bg_color'] ?? '#000000',
                    'text_color' => $bar['text_color'] ?? '#ffffff',
                    'active'     => true,
                    'sort_order' => 1,
                ]);
            }
        });
    }
}
