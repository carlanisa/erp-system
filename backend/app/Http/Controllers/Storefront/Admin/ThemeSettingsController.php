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
            'enabled_languages' => 'nullable|array',
            'default_language' => 'nullable|string|max:8',
        ]);
        $row = ThemeSetting::current();
        $row->update($data);
        return response()->json($row);
    }

    public function applyPreset(Request $request)
    {
        $preset = $request->validate(['preset' => 'required|in:carlanisa,elegant,bold,minimal,pastel,luxury,raya,modern,earth,tropical,noir,lavender'])['preset'];
        $palettes = [
            // ── Originals ────────────────────────────────────────────────
            'carlanisa' => ['color_primary' => '#5d2a2a', 'color_accent' => '#b8860b', 'color_bg' => '#fdfaf5', 'color_surface' => '#ffffff', 'color_text' => '#2b1d14', 'color_muted' => '#6b5d4f', 'color_sale' => '#dc2626', 'font_heading' => 'Playfair Display', 'font_body' => 'Inter'],
            'elegant'   => ['color_primary' => '#7f1d1d', 'color_accent' => '#b8860b', 'color_bg' => '#faf7f2', 'color_surface' => '#ffffff', 'color_text' => '#2b1d14', 'color_muted' => '#6b5d4f', 'color_sale' => '#dc2626', 'font_heading' => 'Playfair Display', 'font_body' => 'Inter'],
            'bold'      => ['color_primary' => '#dc2626', 'color_accent' => '#fbbf24', 'color_bg' => '#fffaf0', 'color_surface' => '#ffffff', 'color_text' => '#18181b', 'color_muted' => '#71717a', 'color_sale' => '#ea580c', 'font_heading' => 'Bebas Neue', 'font_body' => 'Inter'],
            'minimal'   => ['color_primary' => '#18181b', 'color_accent' => '#525252', 'color_bg' => '#ffffff', 'color_surface' => '#fafafa', 'color_text' => '#18181b', 'color_muted' => '#737373', 'color_sale' => '#dc2626', 'font_heading' => 'Inter',            'font_body' => 'Inter'],
            'pastel'    => ['color_primary' => '#86905c', 'color_accent' => '#f4a4a4', 'color_bg' => '#fdfaf6', 'color_surface' => '#ffffff', 'color_text' => '#3f3f46', 'color_muted' => '#71717a', 'color_sale' => '#e11d48', 'font_heading' => 'Cormorant Garamond','font_body' => 'Lato'],

            // ── New top-list presets ────────────────────────────────────
            // Luxury Boutique — Mytheresa / Net-a-Porter style: deep navy + cream + gold
            'luxury'    => ['color_primary' => '#1a2238', 'color_accent' => '#c9a063', 'color_bg' => '#f6f1ea', 'color_surface' => '#ffffff', 'color_text' => '#1a2238', 'color_muted' => '#5d6478', 'color_sale' => '#9b1c1c', 'font_heading' => 'Cormorant Garamond','font_body' => 'Inter'],

            // Raya / Eid Festive — emerald + gold + cream, celebratory
            'raya'      => ['color_primary' => '#0f5132', 'color_accent' => '#d4af37', 'color_bg' => '#fdf8ec', 'color_surface' => '#ffffff', 'color_text' => '#1c1c1c', 'color_muted' => '#5b6862', 'color_sale' => '#c1272d', 'font_heading' => 'Playfair Display',  'font_body' => 'Lato'],

            // Modern Minimalist — pure white + black with red accent. Allbirds / Aesop vibe.
            'modern'    => ['color_primary' => '#0a0a0a', 'color_accent' => '#ef4444', 'color_bg' => '#ffffff', 'color_surface' => '#fafafa', 'color_text' => '#0a0a0a', 'color_muted' => '#737373', 'color_sale' => '#ef4444', 'font_heading' => 'DM Sans',          'font_body' => 'DM Sans'],

            // Earth Organic — terracotta + olive + sand. Sustainable brand feel.
            'earth'     => ['color_primary' => '#9c4221', 'color_accent' => '#7a8450', 'color_bg' => '#f9f3eb', 'color_surface' => '#ffffff', 'color_text' => '#3b2f25', 'color_muted' => '#7a6c5d', 'color_sale' => '#c1272d', 'font_heading' => 'Cormorant Garamond','font_body' => 'Inter'],

            // Tropical Vibrant — peacock blue + coral + cream, festive
            'tropical'  => ['color_primary' => '#0f7c8a', 'color_accent' => '#ff8a65', 'color_bg' => '#fffaf2', 'color_surface' => '#ffffff', 'color_text' => '#22333b', 'color_muted' => '#6b7c87', 'color_sale' => '#e63946', 'font_heading' => 'Poppins',         'font_body' => 'Poppins'],

            // Mono Noir — black + grey + warm white. Streetwear, bold drops.
            'noir'      => ['color_primary' => '#000000', 'color_accent' => '#facc15', 'color_bg' => '#fafafa', 'color_surface' => '#ffffff', 'color_text' => '#0a0a0a', 'color_muted' => '#525252', 'color_sale' => '#facc15', 'font_heading' => 'Bebas Neue',      'font_body' => 'Inter'],

            // Lavender Dream — lavender + dusty rose + cream, romantic
            'lavender'  => ['color_primary' => '#7c3aed', 'color_accent' => '#f9a8d4', 'color_bg' => '#fdfaff', 'color_surface' => '#ffffff', 'color_text' => '#3f3f46', 'color_muted' => '#6b7280', 'color_sale' => '#e11d48', 'font_heading' => 'Cormorant Garamond','font_body' => 'Poppins'],
        ];
        $row = ThemeSetting::current();
        $row->update(array_merge(['preset' => $preset], $palettes[$preset]));
        return response()->json($row);
    }

    // ── Sections ───────────────────────────────────────────────────────
    public function sections(Request $request)
    {
        $pageId = $request->query('page_id');
        if (!$pageId) {
            $pageId = \App\Models\Storefront\Page::home()->id;
        }
        return response()->json(
            Section::where('page_id', $pageId)->orderBy('position')->get()
        );
    }

    public function storeSection(Request $request)
    {
        $data = $this->sectionPayload($request, true);
        if (empty($data['page_id'])) {
            $data['page_id'] = \App\Models\Storefront\Page::home()->id;
        }
        $maxPos = Section::where('page_id', $data['page_id'])->max('position') ?? 0;
        $data['position'] = $data['position'] ?? ($maxPos + 1);
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
            'page_id'  => 'nullable|integer|exists:storefront_pages,id',
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
