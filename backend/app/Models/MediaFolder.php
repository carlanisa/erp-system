<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MediaFolder extends Model
{
    protected $table = 'media_folders';
    protected $fillable = ['name'];

    public static function slug(string $name): string
    {
        return Str::slug($name) ?: 'uploads';
    }
}
