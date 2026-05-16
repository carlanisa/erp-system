<?php

namespace App\Models\AI;

use App\Models\HRM\Employee;
use App\Models\Projects\Task;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiChatConversation extends Model
{
    protected $fillable = [
        'employee_id', 'task_id', 'language', 'title', 'last_message_at',
    ];

    protected $casts = ['last_message_at' => 'datetime'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiChatMessage::class, 'conversation_id')->orderBy('id');
    }
}
