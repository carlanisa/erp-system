<?php

namespace App\Http\Controllers\Storefront\Admin;

use App\Http\Controllers\Controller;
use App\Models\Storefront\AnnouncementBar;
use App\Models\Storefront\Section;
use App\Models\Storefront\ThemeSetting;
use Illuminate\Http\Request;

class ThemeSettingsController extends Controller
{
    // ── Theme settings ────────────────────────────────────────────────
    public function settings()           { return response()->json(ThemeSetting::current()); }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'preset'           => 'nullable|string|max:30',
            'color_primary'    => 'nullable|string|max:30',
            'color_accent'     => 'nullable|string|max:30',
            'color_bg'         => 'nullable|string|max:30',
            'color_surface'    => 'nullable|string|max:30',
            'color_text'       => 'nullable|string|max:30',
            'color_muted'      => 'nullable|string|max:30',
            'color_sale'       => 'nullable|string|max:30',
            'font_heading'     => 'nullable|string|max:60',
            'font_body'        => 'nullable|string|max:60',
            'brand_name'       => 'nullable|string|max:120',
            'brand_tagline'    => 'nullable|string|max:160',
            'logo_url'         => 'nullable|string|max:500',
            'favicon_url'      => 'nullable|string|max:500',
            'contact_phone'    => 'nullable|string|max:30',
            'contact_whatsapp' => 'nullable|string|max:30',
            'contact_email'    => 'nullable|string|max:120',
            'contact_address'  => 'nullable|string|max:255',
            'social_instagram' => 'nullable|string|max:255',
            'social_facebook'  => 'nullable|string|max:255',
            'social_tiktok'    => 'nullable|string|max:255',
            'social_youtube'   => 'nullable|string|max:255',
            'newsletter_popup_enabled' => 'nullable|boolean',
            'currency_display' => 'nullable|string|max:8',
            'extra_json'       => 'nullable|array',
        ]);
        $row = ThemeSetting::current();
        $row->update($data);
        return response()->json($row);
    }

    public function applyPreset(Request $request)
    {
        $preset = $request->validate(['preset' => 'required|in:elegant,bold,minimal,pastel,carlanisa'])['preset'];
        $palettes = [
            'elegant'   => ['color_primary' => '#7f1d1d', 'color_accent' => '#b8860b', 'color_bg' => '#faf7f2', 'color_surface' => '#ffffff', 'color_text' => '#2b1d14', 'color_muted' => '#6b5d4f', 'font_heading' => 'Playfair Display', 'font_body' => 'Inter'],
            'bold'      => ['color_primary' => '#dc2626', 'color_accent' => '#fbbf24', 'color_bg' => '#fffaf0', 'color_surface' => '#ffffff', 'color_text' => '#18181b', 'color_muted' => '#71717a', 'font_heading' => 'Bebas Neue', 'font_body' => 'Inter'],
            'minimal'   => ['color_primary' => '#18181b', 'color_accent' => '#525252', 'color_bg' => '#ffffff', 'color_surface' => '#fafafa', 'color_text' => '#18181b', 'color_muted' => '#737373', 'font_heading' => 'Inter', 'font_body' => 'Inter'],
            'pastel'    => ['color_primary' => '#86905c', 'color_accent' => '#f4a4a4', 'color_bg' => '#fdfaf6', 'color_surface' => '#ffffff', 'color_text' => '#3f3f46', 'color_muted' => '#71717a', 'font_heading' => 'Cormorant Garamond', 'font_body' => 'Lato'],
            'carlanisa' => ['color_primary' => '#5d2a2a', 'color_accent' => '#b8860b', 'color_bg' => '#fdfaf5', 'color_surface' => '#ffffff', 'color_text' => '#2b1d14', 'color_muted' => '#6b5d4f', 'font_heading' => 'Playfair Display', 'font_body' => 'Inter'],
        ];
        $row = ThemeSetting::current();
        $row->update(array_merge(['preset' => $preset], $palettes[$preset]));
        return response()->json($row);
    }

    // ── Sections ───────────────────────────────────────────────────────
    public function sections()
    {
        return response()->json(Section::orderBy('position')->get());
    }

    public function storeSection(Request $request)
    {
        $data = $this->sectionPayload($request, true);
        $data['position'] = $data['position'] ?? ((Section::max('position') ?? 0) + 1);
        return response()->json(Section::create($data), 201);
    }

    public function updateSection(Request $request, int $id)
    {
        $s = Section::findOrFail($id);
        $s->update($this->sectionPayload($request, false));
        return response()->json($s);
    }

    public function destroySection(int $id)
    {
        Section::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function reorderSections(Request $request)
    {
        $data = $request->validate(['order' => 'required|array', 'order.*' => 'integer']);
        foreach ($data['order'] as $i => $id) {
            Section::where('id', $id)->update(['position' => $i]);
        }
        return response()->json(['ok' => true]);
    }

    private function sectionPayload(Request $request, bool $creating): array
    {
        return $request->validate([
            'type'     => ($creating ? 'required' : 'nullable') . '|string|max:30',
            'label'    => 'nullable|string|max:120',
            'position' => 'nullable|integer',
            'enabled'  => 'nullable|boolean',
            'config_json' => 'nullable|array',
        ]);
    }

    // ── Announcement bars ──────────────────────────────────────────────
    public function bars()
    {
        return response()->json(AnnouncementBar::orderBy('sort_order')->get());
    }

    public function storeBar(Request $request)
    {
        $data = $this->barPayload($request, true);
        return response()->json(AnnouncementBar::create($data), 201);
    }

    public function updateBar(Request $request, int $id)
    {
        $b = AnnouncementBar::findOrFail($id);
        $b->update($this->barPayload($request, false));
        return response()->json($b);
    }

    public function destroyBar(int $id)
    {
        AnnouncementBar::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    private function barPayload(Request $request, bool $creating): array
    {
        return $request->validate([
            'text'       => ($creating ? 'required' : 'nullable') . '|string|max:255',
            'link_url'   => 'nullable|string|max:500',
            'bg_color'   => 'nullable|string|max:30',
            'text_color' => 'nullable|string|max:30',
            'starts_at'  => 'nullable|date',
            'ends_at'    => 'nullable|date',
            'active'     => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);
    }
}
