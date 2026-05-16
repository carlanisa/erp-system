<?php

namespace Database\Seeders;

use App\Models\HRM\Employee;
use App\Models\HRM\Attendance;
use App\Models\HRM\LeaveRequest;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            ['name'=>'Muhammad Ali Khan',   'email'=>'ali.khan@company.com',    'phone'=>'0300-1111111', 'cnic'=>'42101-1234567-1', 'dept'=>'IT',          'desig'=>'Senior Developer',    'salary'=>85000,  'days'=>-365],
            ['name'=>'Sara Ahmed',          'email'=>'sara.ahmed@company.com',  'phone'=>'0321-2222222', 'cnic'=>'42101-2345678-2', 'dept'=>'HR',          'desig'=>'HR Manager',          'salary'=>70000,  'days'=>-500],
            ['name'=>'Bilal Hussain',       'email'=>'bilal@company.com',       'phone'=>'0333-3333333', 'cnic'=>'42101-3456789-3', 'dept'=>'Finance',     'desig'=>'Accountant',          'salary'=>60000,  'days'=>-200],
            ['name'=>'Fatima Sheikh',       'email'=>'fatima@company.com',      'phone'=>'0345-4444444', 'cnic'=>'42101-4567890-4', 'dept'=>'Sales',       'desig'=>'Sales Executive',     'salary'=>55000,  'days'=>-150],
            ['name'=>'Usman Tariq',         'email'=>'usman@company.com',       'phone'=>'0311-5555555', 'cnic'=>'42101-5678901-5', 'dept'=>'IT',          'desig'=>'Junior Developer',    'salary'=>45000,  'days'=>-90],
            ['name'=>'Ayesha Malik',        'email'=>'ayesha@company.com',      'phone'=>'0302-6666666', 'cnic'=>'42101-6789012-6', 'dept'=>'Marketing',   'desig'=>'Marketing Manager',   'salary'=>65000,  'days'=>-300],
            ['name'=>'Hamza Riaz',          'email'=>'hamza@company.com',       'phone'=>'0303-7777777', 'cnic'=>'42101-7890123-7', 'dept'=>'Operations',  'desig'=>'Operations Manager',  'salary'=>72000,  'days'=>-420],
            ['name'=>'Zainab Qureshi',      'email'=>'zainab@company.com',      'phone'=>'0304-8888888', 'cnic'=>'42101-8901234-8', 'dept'=>'Finance',     'desig'=>'Finance Manager',     'salary'=>78000,  'days'=>-600],
            ['name'=>'Tariq Mehmood',       'email'=>'tariq@company.com',       'phone'=>'0305-9999999', 'cnic'=>'42101-9012345-9', 'dept'=>'Sales',       'desig'=>'Sales Manager',       'salary'=>80000,  'days'=>-250],
            ['name'=>'Rabia Noor',          'email'=>'rabia@company.com',       'phone'=>'0306-0000000', 'cnic'=>'42201-0123456-0', 'dept'=>'Marketing',   'desig'=>'Content Writer',      'salary'=>40000,  'days'=>-60],
        ];

        foreach ($employees as $i => $e) {
            Employee::create([
                'employee_code' => 'EMP' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                'name'          => $e['name'],
                'email'         => $e['email'],
                'phone'         => $e['phone'],
                'cnic'          => $e['cnic'],
                'department'    => $e['dept'],
                'designation'   => $e['desig'],
                'basic_salary'  => $e['salary'],
                'join_date'     => now()->addDays($e['days'])->format('Y-m-d'),
                'status'        => 'active',
                'address'       => 'Kuala Lumpur, Malaysia',
            ]);
        }

        // Mark attendance for last 7 days
        $empIds = Employee::pluck('id');
        $statuses = ['present', 'present', 'present', 'present', 'absent', 'present', 'half_day'];

        for ($d = 6; $d >= 0; $d--) {
            $date = now()->subDays($d)->format('Y-m-d');
            foreach ($empIds as $i => $empId) {
                $status = $statuses[($i + $d) % count($statuses)];
                Attendance::create([
                    'employee_id' => $empId,
                    'date'        => $date,
                    'status'      => $status,
                    'check_in'    => $status !== 'absent' ? '09:00' : null,
                    'check_out'   => $status === 'present' ? '18:00' : ($status === 'half_day' ? '13:00' : null),
                ]);
            }
        }

        // Add some leave requests
        $leaveData = [
            ['emp' => 1, 'from' => now()->addDays(3)->format('Y-m-d'), 'to' => now()->addDays(5)->format('Y-m-d'), 'type' => 'annual',  'status' => 'pending',  'reason' => 'Family vacation'],
            ['emp' => 3, 'from' => now()->subDays(5)->format('Y-m-d'), 'to' => now()->subDays(3)->format('Y-m-d'), 'type' => 'sick',    'status' => 'approved', 'reason' => 'Fever and flu'],
            ['emp' => 5, 'from' => now()->addDays(10)->format('Y-m-d'),'to' => now()->addDays(10)->format('Y-m-d'),'type' => 'casual', 'status' => 'pending',  'reason' => 'Personal work'],
            ['emp' => 7, 'from' => now()->subDays(2)->format('Y-m-d'), 'to' => now()->subDays(1)->format('Y-m-d'), 'type' => 'annual',  'status' => 'approved', 'reason' => 'Wedding ceremony'],
            ['emp' => 2, 'from' => now()->addDays(7)->format('Y-m-d'), 'to' => now()->addDays(8)->format('Y-m-d'), 'type' => 'casual',  'status' => 'rejected', 'reason' => 'Shopping', 'admin_notes' => 'Too many leaves this month'],
        ];

        $empList = Employee::pluck('id')->values();
        foreach ($leaveData as $l) {
            LeaveRequest::create([
                'employee_id' => $empList[$l['emp'] - 1],
                'from_date'   => $l['from'],
                'to_date'     => $l['to'],
                'type'        => $l['type'],
                'reason'      => $l['reason'],
                'status'      => $l['status'],
                'admin_notes' => $l['admin_notes'] ?? null,
            ]);
        }
    }
}
