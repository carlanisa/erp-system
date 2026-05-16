<?php

namespace Database\Seeders;

use App\Http\Controllers\Api\PermissionMatrixController;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionMatrixController::MODULES as $module) {
            foreach (PermissionMatrixController::ACTIONS as $action) {
                Permission::firstOrCreate([
                    'name'       => "{$module}.{$action}",
                    'guard_name' => 'web',
                ]);
            }
        }

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::where('guard_name', 'web')->get());

        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);

        // Auto-grant full permissions to existing admin users
        User::where('role', 'admin')->each(function ($u) use ($admin) {
            $u->syncPermissions(Permission::where('guard_name', 'web')->get());
        });
    }
}
