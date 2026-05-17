<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $q = Media::orderByDesc('id');
        if ($s = $request->query('search')) {
            $q->where(function ($x) use ($s) {
                $x->where('filename', 'ilike', "%$s%")
                  ->orWhere('original_name', 'ilike', "%$s%")
                  ->orWhere('alt_text', 'ilike', "%$s%");
            });
        }
        if ($folder = $request->query('folder')) $q->where('folder', $folder);
        return response()->json($q->paginate((int) $request->query('per_page', 36)));
    }

    public function show(int $id)
    {
        return response()->json(Media::findOrFail($id));
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file'   => 'required|file|mimes:jpg,jpeg,png,gif,webp,avif,svg|max:10240', // 10 MB
            'folder' => 'nullable|string|max:60',
            'alt_text' => 'nullable|string|max:255',
        ]);
        $file = $request->file('file');
        $folder = $request->input('folder', 'uploads');

        // Slugify original name → "Baju Kurung Red (1).JPG" → "baju-kurung-red-1.jpg"
        $original = $file->getClientOriginalName();
        $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $base = pathinfo($original, PATHINFO_FILENAME);
        $slug = Str::slug($base) ?: 'image';

        // Deduplicate: if slug.ext exists, append -2, -3 ...
        $candidate = "$slug.$ext";
        $i = 2;
        while (Storage::disk('public')->exists("media/$candidate")) {
            $candidate = "$slug-$i.$ext"; $i++;
        }

        Storage::disk('public')->putFileAs('media', $file, $candidate);

        // Image dimensions (graceful — works on jpg/png/gif/webp; svg/etc. fall back to null)
        [$w, $h] = @getimagesize($file->getRealPath()) ?: [null, null];

        $altText = $request->input('alt_text') ?: $this->humanize($slug);

        $media = Media::create([
            'filename'      => $candidate,
            'original_name' => $original,
            'mime_type'     => $file->getMimeType() ?? "image/$ext",
            'size'          => $file->getSize(),
            'width'         => $w ?: null,
            'height'        => $h ?: null,
            'alt_text'      => $altText,
            'folder'        => $folder,
            'uploaded_by'   => optional($request->user())->id,
        ]);

        return response()->json($media, 201);
    }

    public function update(Request $request, int $id)
    {
        $media = Media::findOrFail($id);
        $data = $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'folder'   => 'nullable|string|max:60',
        ]);
        $media->update($data);
        return response()->json($media);
    }

    public function destroy(int $id)
    {
        $media = Media::findOrFail($id);
        try { Storage::disk('public')->delete('media/' . $media->filename); } catch (\Throwable $e) {}
        $media->delete();
        return response()->json(['ok' => true]);
    }

    private function humanize(string $slug): string
    {
        return Str::title(str_replace('-', ' ', $slug));
    }
}
