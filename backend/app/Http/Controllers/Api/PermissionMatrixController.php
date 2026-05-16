<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;

class PermissionMatrixController extends Controller
{
    use ApiResponse;

    public const MODULES = [
        'dashboard', 'general_ledger', 'suppliers', 'sales', 'inventory',
        'hrm', 'crm', 'projects', 'reports', 'settings',
    ];

    public const ACTIONS = ['view', 'create', 'edit', 'delete'];

    public function matrix(): JsonResponse
    {
        $users = User::orderBy('name')->get(['id', 'name', 'email', 'role', 'is_active'])
            ->map(function ($u) {
                return [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'email'      => $u->email,
                    'role'       => $u->role,
                    'is_active'  => $u->is_active,
                    'permissions'=> $u->getAllPermissions()->pluck('name')->values(),
                    'is_admin'   => $u->role === 'admin',
                ];
            });

        return $this->success([
            'users'   => $users,
            'modules' => self::MODULES,
            'actions' => self::ACTIONS,
        ]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'permissions'   => 'array',
            'permissions.*' => 'string',
        ]);

        $valid = collect($data['permissions'] ?? [])
            ->filter(fn ($p) => Permission::where('name', $p)->where('guard_name', 'web')->exists())
            ->values()
            ->all();

        $user->syncPermissions($valid);

        return $this->success([
            'user_id'     => $user->id,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ], 'Permissions updated');
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role'     => 'required|in:admin,staff',
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => $data['role'],
            'is_active' => true,
        ]);

        return $this->success([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ], 'User created', 201);
    }
}
