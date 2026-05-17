<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Models\MediaFolder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    // ─────────────────────────────────────────────────────────────
    // Folders
    // ─────────────────────────────────────────────────────────────

    /** Return every folder with image count + total size. */
    public function folders()
    {
        $stats = Media::select('folder', DB::raw('count(*) as count'), DB::raw('coalesce(sum(size),0) as size'))
            ->groupBy('folder')->get()->keyBy('folder');

        $known = MediaFolder::orderBy('name')->pluck('name')->all();
        // Include any folder that has media but isn't yet a row in media_folders
        $names = array_values(array_unique(array_merge($known, $stats->keys()->all())));
        sort($names, SORT_NATURAL | SORT_FLAG_CASE);

        $total = (int) Media::count();
        $totalSize = (int) Media::sum('size');

        return response()->json([
            'total_count' => $total,
            'total_size'  => $totalSize,
            'folders' => array_map(fn($n) => [
                'name'  => $n,
                'count' => (int) ($stats[$n]->count ?? 0),
                'size'  => (int) ($stats[$n]->size  ?? 0),
            ], $names),
        ]);
    }

    public function createFolder(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:60']);
        $slug = MediaFolder::slug($data['name']);
        $folder = MediaFolder::firstOrCreate(['name' => $slug]);
        return response()->json($folder, 201);
    }

    public function renameFolder(Request $request, string $name)
    {
        $data = $request->validate(['name' => 'required|string|max:60']);
        $newName = MediaFolder::slug($data['name']);
        if ($newName === $name) return response()->json(['ok' => true]);
        if (MediaFolder::where('name', $newName)->exists() && $newName !== 'uploads') {
            return response()->json(['message' => 'A folder with this name already exists.'], 422);
        }
        DB::transaction(function () use ($name, $newName) {
            MediaFolder::where('name', $name)->update(['name' => $newName]);
            Media::where('folder', $name)->update(['folder' => $newName]);
        });
        return response()->json(['ok' => true, 'name' => $newName]);
    }

    public function deleteFolder(Request $request, string $name)
    {
        if ($name === 'uploads') {
            return response()->json(['message' => 'Cannot delete the default uploads folder.'], 422);
        }
        $count = Media::where('folder', $name)->count();
        $moveTo = $request->input('move_to', 'uploads');
        if ($count > 0) {
            Media::where('folder', $name)->update(['folder' => $moveTo]);
        }
        MediaFolder::where('name', $name)->delete();
        return response()->json(['ok' => true, 'moved' => $count, 'to' => $moveTo]);
    }

    public function bulkMove(Request $request)
    {
        $data = $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer',
            'folder' => 'required|string|max:60',
        ]);
        $folder = MediaFolder::slug($data['folder']);
        // Make sure target folder exists in the index
        MediaFolder::firstOrCreate(['name' => $folder]);
        $updated = Media::whereIn('id', $data['ids'])->update(['folder' => $folder]);
        return response()->json(['ok' => true, 'updated' => $updated, 'folder' => $folder]);
    }
}
