<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CompanySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->success($this->payload(CompanySetting::current()));
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'legal_name'   => 'nullable|string|max:255',
            'tax_id'       => 'nullable|string|max:100',
            'reg_number'   => 'nullable|string|max:100',
            'address'      => 'nullable|string|max:500',
            'city'         => 'nullable|string|max:100',
            'state'        => 'nullable|string|max:100',
            'postcode'     => 'nullable|string|max:20',
            'country'      => 'nullable|string|max:100',
            'phone'        => 'nullable|string|max:50',
            'email'        => 'nullable|email|max:255',
            'website'      => 'nullable|string|max:255',
        ]);

        $s = CompanySetting::current();
        $s->fill($data)->save();
        return $this->success($this->payload($s), 'Company info updated');
    }

    public function updateAccounting(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currency'           => 'required|string|max:8',
            'currency_symbol'    => 'required|string|max:8',
            'fiscal_year_start'  => 'required|string|max:2',
            'tax_rate'           => 'required|numeric|min:0|max:100',
            'default_branch'     => 'nullable|string|max:50',
            'invoice_prefix'     => 'nullable|string|max:20',
            'pv_prefix'          => 'nullable|string|max:20',
            'or_prefix'          => 'nullable|string|max:20',
            'je_prefix'          => 'nullable|string|max:20',
            'payment_terms'      => 'required|integer|min:0|max:365',
            'decimal_places'     => 'required|integer|min:0|max:6',
        ]);

        $s = CompanySetting::current();
        $s->accounting = $data;
        $s->save();
        return $this->success($this->payload($s), 'Accounting settings updated');
    }

    public function updateSystem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'language'       => 'required|string|max:10',
            'timezone'       => 'required|string|max:64',
            'date_format'    => 'required|string|max:32',
            'time_format'    => 'required|in:12h,24h',
            'theme'          => 'required|in:light,dark',
            'items_per_page' => 'required|integer|min:5|max:200',
        ]);

        $s = CompanySetting::current();
        $s->system = $data;
        $s->save();
        return $this->success($this->payload($s), 'System settings updated');
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_due'      => 'required|boolean',
            'payment_received' => 'required|boolean',
            'low_stock'        => 'required|boolean',
            'payroll_due'      => 'required|boolean',
            'leave_request'    => 'required|boolean',
            'email_notify'     => 'required|boolean',
            'system_notify'    => 'required|boolean',
        ]);

        $s = CompanySetting::current();
        $s->notifications = $data;
        $s->save();
        return $this->success($this->payload($s), 'Notification settings updated');
    }

    public function updateSecurity(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_timeout_minutes' => 'required|integer|min:5|max:1440',
            'password_min_length'     => 'required|integer|min:6|max:64',
            'require_2fa_for_admins'  => 'required|boolean',
        ]);

        $s = CompanySetting::current();
        $s->security = $data;
        $s->save();
        return $this->success($this->payload($s), 'Security settings updated');
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|image|max:2048',
        ]);

        $s = CompanySetting::current();

        // Delete old logo if exists
        if ($s->logo_path && Storage::disk('public')->exists($s->logo_path)) {
            Storage::disk('public')->delete($s->logo_path);
        }

        $stored = $request->file('file')->store('logos/' . now()->format('Y/m'), 'public');
        $s->logo_path = $stored;
        $s->save();

        return $this->success([
            'logo_path' => $stored,
            'logo_url'  => Storage::disk('public')->url($stored),
        ], 'Logo uploaded');
    }

    private function payload(CompanySetting $s): array
    {
        return [
            'company' => [
                'company_name' => $s->company_name,
                'legal_name'   => $s->legal_name,
                'tax_id'       => $s->tax_id,
                'reg_number'   => $s->reg_number,
                'address'      => $s->address,
                'city'         => $s->city,
                'state'        => $s->state,
                'postcode'     => $s->postcode,
                'country'      => $s->country,
                'phone'        => $s->phone,
                'email'        => $s->email,
                'website'      => $s->website,
                'logo_path'    => $s->logo_path,
                'logo_url'     => $s->logo_path ? Storage::disk('public')->url($s->logo_path) : null,
            ],
            'accounting'    => $s->accounting    ?? CompanySetting::defaultAccounting(),
            'system'        => $s->system        ?? CompanySetting::defaultSystem(),
            'notifications' => $s->notifications ?? CompanySetting::defaultNotifications(),
            'security'      => $s->security      ?? CompanySetting::defaultSecurity(),
        ];
    }
}
