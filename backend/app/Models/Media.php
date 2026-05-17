<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    protected $table = 'media';

    protected $fillable = [
        'filename', 'original_name', 'mime_type', 'size',
        'width', 'height', 'alt_text', 'folder', 'uploaded_by',
    ];

    protected $appends = ['url'];

    /** Plain public URL: /storage/media/{filename}. No hashes, no query params. */
    public function getUrlAttribute(): string
    {
        return '/storage/media/' . $this->filename;
    }
}
