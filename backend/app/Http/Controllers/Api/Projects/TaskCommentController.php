<?php

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Projects\Task;
use App\Models\Projects\TaskComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    use ApiResponse;

    public function store(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'body'        => 'required|string',
        ]);
        $data['task_id'] = $task->id;
        $comment = TaskComment::create($data);
        return $this->success($comment->load('employee:id,name'), 'Comment added', 201);
    }

    public function destroy(TaskComment $comment): JsonResponse
    {
        $comment->delete();
        return $this->success(null, 'Comment deleted');
    }
}
