<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // 1. បិទ Foreign Key Checks និង Wipe/Reset Tables ចាស់ៗចោល
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('user_roles')->truncate();
        User::truncate();
        Role::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. បង្កើត Roles ថ្មី
        $adminRole   = Role::create(['role_name' => 'Admin']);
        $managerRole = Role::create(['role_name' => 'Manager']);
        $cashierRole = Role::create(['role_name' => 'Cashier']);

        // 3. បង្កើត Admin User
        $adminUser = User::create([
            'username'      => 'admin',
            'full_name'     => 'System Admin',
            'email'         => 'admin@pos.com',
            'phone'         => '012345678',
            'pin_code'      => Hash::make('123456'),
            'password_hash' => Hash::make('11112222'),
            'is_active'     => true,
        ]);
        $adminUser->roles()->sync([$adminRole->role_id]);

        // 4. បង្កើត Manager User
        $managerUser = User::create([
            'username'      => 'manager',
            'full_name'     => 'Store Manager',
            'email'         => 'manager@pos.com',
            'phone'         => '012345679',
            'pin_code'      => Hash::make('123456'),
            'password_hash' => Hash::make('11112222'),
            'is_active'     => true,
        ]);
        $managerUser->roles()->sync([$managerRole->role_id]);

        // 5. បង្កើត Cashiers
        $cashiers = [
            ['username' => 'sokha',    'full_name' => 'Sokha Chen'],
            ['username' => 'vanna',    'full_name' => 'Vanna Heng'],
            ['username' => 'bopha',    'full_name' => 'Bopha Kim'],
            ['username' => 'dara',     'full_name' => 'Dara Rath'],
            ['username' => 'sophea',   'full_name' => 'Sophea Keo'],
            ['username' => 'piseth',   'full_name' => 'Piseth San'],
            ['username' => 'chanthea', 'full_name' => 'Chanthea Ly'],
            ['username' => 'channary', 'full_name' => 'Channary Touch'],
            ['username' => 'mony',     'full_name' => 'Mony Seng'],
            ['username' => 'kosal',    'full_name' => 'Kosal Ung'],
        ];

        foreach ($cashiers as $index => $cashierData) {
            $cashierUser = User::create([
                'username'      => $cashierData['username'],
                'full_name'     => $cashierData['full_name'],
                'email'         => $cashierData['username'] . '@pos.com',
                'phone'         => '09200000' . ($index + 1),
                'pin_code'      => Hash::make('123456'),
                'password_hash' => Hash::make('11112222'),
                'is_active'     => true,
            ]);
            $cashierUser->roles()->sync([$cashierRole->role_id]);
        }
    }
}