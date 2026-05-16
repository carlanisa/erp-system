<?php

namespace Database\Seeders;

use App\Models\HRM\AllowanceType;
use App\Models\HRM\DeductionType;
use App\Models\HRM\Department;
use App\Models\HRM\Designation;
use App\Models\HRM\Employee;
use App\Models\HRM\Holiday;
use App\Models\HRM\LeaveType;
use App\Models\HRM\Shift;
use Illuminate\Database\Seeder;

class HrmMasterSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Departments ───
        $depts = [
            ['code' => 'IT',          'name' => 'Information Technology', 'manager' => 'Muhammad Ali Khan'],
            ['code' => 'HR',          'name' => 'Human Resources',        'manager' => 'Sara Ahmed'],
            ['code' => 'FINANCE',     'name' => 'Finance & Accounts',     'manager' => 'Zainab Qureshi'],
            ['code' => 'SALES',       'name' => 'Sales',                  'manager' => 'Tariq Mehmood'],
            ['code' => 'MARKETING',   'name' => 'Marketing',              'manager' => 'Ayesha Malik'],
            ['code' => 'OPERATIONS',  'name' => 'Operations',             'manager' => 'Hamza Riaz'],
        ];
        foreach ($depts as $d) {
            Department::updateOrCreate(['code' => $d['code']], $d + ['is_active' => true]);
        }

        // ─── Designations (per department) ───
        $designations = [
            'IT'         => ['Senior Developer','Junior Developer','DevOps Engineer','QA Engineer','IT Manager'],
            'HR'         => ['HR Manager','HR Executive','Recruiter','HR Assistant'],
            'FINANCE'    => ['Finance Manager','Senior Accountant','Accountant','Finance Analyst'],
            'SALES'      => ['Sales Manager','Sales Executive','Account Manager','Business Development'],
            'MARKETING'  => ['Marketing Manager','Content Writer','SEO Specialist','Graphic Designer'],
            'OPERATIONS' => ['Operations Manager','Operations Executive','Supply Chain','Logistics'],
        ];
        foreach ($designations as $deptCode => $titles) {
            $dept = Department::where('code', $deptCode)->first();
            if (!$dept) continue;
            foreach ($titles as $t) {
                Designation::updateOrCreate(
                    ['department_id' => $dept->id, 'title' => $t],
                    ['is_active' => true]
                );
            }
        }

        // ─── Leave Types ───
        $types = [
            ['code' => 'AL', 'name' => 'Annual Leave',     'days_per_year' => 14, 'is_paid' => true,  'carry_forward' => true,  'color' => 'blue'],
            ['code' => 'SL', 'name' => 'Sick Leave',       'days_per_year' => 10, 'is_paid' => true,  'carry_forward' => false, 'color' => 'amber'],
            ['code' => 'CL', 'name' => 'Casual Leave',     'days_per_year' => 7,  'is_paid' => true,  'carry_forward' => false, 'color' => 'emerald'],
            ['code' => 'UL', 'name' => 'Unpaid Leave',     'days_per_year' => 0,  'is_paid' => false, 'carry_forward' => false, 'color' => 'rose'],
            ['code' => 'ML', 'name' => 'Maternity Leave',  'days_per_year' => 60, 'is_paid' => true,  'carry_forward' => false, 'color' => 'pink'],
            ['code' => 'PL', 'name' => 'Paternity Leave',  'days_per_year' => 7,  'is_paid' => true,  'carry_forward' => false, 'color' => 'cyan'],
        ];
        foreach ($types as $t) {
            LeaveType::updateOrCreate(['code' => $t['code']], $t + ['is_active' => true]);
        }

        // ─── Public Holidays Malaysia 2026 ───
        $year = (int) now()->year;
        $holidays = [
            ['date' => "$year-01-01", 'name' => "New Year's Day",        'type' => 'public'],
            ['date' => "$year-02-01", 'name' => "Federal Territory Day", 'type' => 'public'],
            ['date' => "$year-02-17", 'name' => "Chinese New Year",      'type' => 'public'],
            ['date' => "$year-05-01", 'name' => "Labour Day",            'type' => 'public'],
            ['date' => "$year-05-31", 'name' => "Wesak Day",             'type' => 'public'],
            ['date' => "$year-06-02", 'name' => "Agong's Birthday",      'type' => 'public'],
            ['date' => "$year-08-31", 'name' => "Merdeka Day",           'type' => 'public'],
            ['date' => "$year-09-16", 'name' => "Malaysia Day",          'type' => 'public'],
            ['date' => "$year-11-08", 'name' => "Deepavali",             'type' => 'religious'],
            ['date' => "$year-12-25", 'name' => "Christmas Day",         'type' => 'public'],
        ];
        foreach ($holidays as $h) {
            Holiday::updateOrCreate(
                ['date' => $h['date'], 'name' => $h['name']],
                $h + ['is_active' => true]
            );
        }

        // ─── Shifts ───
        $shifts = [
            ['code' => 'GEN', 'name' => 'General (9–6)',  'start_time' => '09:00', 'end_time' => '18:00', 'break_minutes' => 60, 'working_days' => ['mon','tue','wed','thu','fri']],
            ['code' => 'MORN','name' => 'Morning (6–2)',  'start_time' => '06:00', 'end_time' => '14:00', 'break_minutes' => 30, 'working_days' => ['mon','tue','wed','thu','fri','sat']],
            ['code' => 'EVE', 'name' => 'Evening (2–10)', 'start_time' => '14:00', 'end_time' => '22:00', 'break_minutes' => 30, 'working_days' => ['mon','tue','wed','thu','fri','sat']],
            ['code' => 'NGT', 'name' => 'Night (10–6)',   'start_time' => '22:00', 'end_time' => '06:00', 'break_minutes' => 30, 'working_days' => ['mon','tue','wed','thu','fri']],
        ];
        foreach ($shifts as $s) {
            Shift::updateOrCreate(['code' => $s['code']], $s + ['is_active' => true]);
        }

        // ─── Allowance Types ───
        $allowances = [
            ['code' => 'HRA',       'name' => 'House Rent Allowance',  'calc_type' => 'percent', 'default_percent' => 10.000, 'is_taxable' => true,  'is_epf_eligible' => true,  'color' => 'emerald'],
            ['code' => 'TRANSPORT', 'name' => 'Transport Allowance',   'calc_type' => 'fixed',   'default_amount'  => 200.00, 'is_taxable' => true,  'is_epf_eligible' => false, 'color' => 'blue'],
            ['code' => 'MEAL',      'name' => 'Meal Allowance',        'calc_type' => 'fixed',   'default_amount'  => 150.00, 'is_taxable' => false, 'is_epf_eligible' => false, 'color' => 'amber'],
            ['code' => 'PHONE',     'name' => 'Phone Allowance',       'calc_type' => 'fixed',   'default_amount'  => 100.00, 'is_taxable' => true,  'is_epf_eligible' => false, 'color' => 'cyan'],
            ['code' => 'MEDICAL',   'name' => 'Medical Allowance',     'calc_type' => 'fixed',   'default_amount'  => 0.00,   'is_taxable' => false, 'is_epf_eligible' => false, 'color' => 'rose'],
            ['code' => 'OT',        'name' => 'Overtime',              'calc_type' => 'fixed',   'default_amount'  => 0.00,   'is_taxable' => true,  'is_epf_eligible' => true,  'color' => 'violet'],
            ['code' => 'BONUS',     'name' => 'Performance Bonus',     'calc_type' => 'fixed',   'default_amount'  => 0.00,   'is_taxable' => true,  'is_epf_eligible' => true,  'color' => 'fuchsia'],
        ];
        foreach ($allowances as $a) {
            AllowanceType::updateOrCreate(['code' => $a['code']], $a + ['is_active' => true]);
        }

        // ─── Deduction Types ───
        $deductions = [
            ['code' => 'EPF_E',  'name' => 'EPF Employee (11%)',     'calc_type' => 'statutory', 'default_percent' => 11.000, 'is_statutory' => true,  'color' => 'rose'],
            ['code' => 'SOCSO_E','name' => 'SOCSO Employee (0.5%)',  'calc_type' => 'statutory', 'default_percent' => 0.500,  'is_statutory' => true,  'color' => 'rose'],
            ['code' => 'EIS_E',  'name' => 'EIS Employee (0.2%)',    'calc_type' => 'statutory', 'default_percent' => 0.200,  'is_statutory' => true,  'color' => 'rose'],
            ['code' => 'PCB',    'name' => 'PCB / Income Tax',       'calc_type' => 'statutory', 'default_percent' => 0.000,  'is_statutory' => true,  'color' => 'amber'],
            ['code' => 'LOAN',   'name' => 'Salary Loan Repayment',  'calc_type' => 'fixed',     'default_amount'  => 0.00,   'is_statutory' => false, 'color' => 'slate'],
            ['code' => 'ADV',    'name' => 'Salary Advance',         'calc_type' => 'fixed',     'default_amount'  => 0.00,   'is_statutory' => false, 'color' => 'slate'],
            ['code' => 'LATE',   'name' => 'Late / Absent Penalty',  'calc_type' => 'fixed',     'default_amount'  => 0.00,   'is_statutory' => false, 'color' => 'red'],
            ['code' => 'ZAKAT',  'name' => 'Zakat',                  'calc_type' => 'fixed',     'default_amount'  => 0.00,   'is_statutory' => false, 'color' => 'emerald'],
        ];
        foreach ($deductions as $d) {
            DeductionType::updateOrCreate(['code' => $d['code']], $d + ['is_active' => true]);
        }

        // ─── Backfill existing employees: link to new department / designation ids ───
        $deptByCode      = Department::pluck('id', 'code');
        $deptIdByName    = Department::pluck('id', 'name');
        $designationMap  = Designation::with('department:id,code')->get()
            ->mapWithKeys(fn ($d) => [
                strtolower($d->department?->code . '::' . $d->title) => $d->id,
            ]);
        $genShiftId      = Shift::where('code', 'GEN')->value('id');

        Employee::query()->each(function (Employee $emp) use ($deptByCode, $deptIdByName, $designationMap, $genShiftId) {
            $deptId = $deptByCode[strtoupper($emp->department)]
                  ?? $deptIdByName[$emp->department]
                  ?? null;

            $desigKey = strtolower(strtoupper($emp->department) . '::' . $emp->designation);
            $desigId  = $designationMap[$desigKey] ?? null;

            $changes = [];
            if ($deptId  && $emp->department_id  !== $deptId)  $changes['department_id']  = $deptId;
            if ($desigId && $emp->designation_id !== $desigId) $changes['designation_id'] = $desigId;
            if ($genShiftId && !$emp->shift_id)                $changes['shift_id']       = $genShiftId;

            if (!empty($changes)) $emp->update($changes);
        });
    }
}
