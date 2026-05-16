<?php

namespace App\Models\CRM;

use Illuminate\Database\Eloquent\Model;

class MessageTemplate extends Model
{
    protected $table = 'crm_message_templates';
    protected $fillable = ['code','name','channel','body','is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
