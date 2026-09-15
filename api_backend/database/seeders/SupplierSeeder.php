<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Supplier::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $suppliers = [
            [
                'supplier_name' => 'Khmer Coffee Import',
                'contact_name'  => 'Sok Dara',
                'phone'         => '012 345 678',
                'email'         => 'sales@khmercoffeeimport.com',
                'address'       => 'Phnom Penh, Street 271',
            ],
            [
                'supplier_name' => 'FreshFarm Bakery & Dairy',
                'contact_name'  => 'Chan Lin',
                'phone'         => '016 890 123',
                'email'         => 'order@freshfarm.com.kh',
                'address'       => 'Phnom Penh, Borey Peng Huoth',
            ],
            [
                'supplier_name' => 'Royal Beverage Distribution',
                'contact_name'  => 'Meas Sokha',
                'phone'         => '077 456 789',
                'email'         => 'info@royalbeverage.com',
                'address'       => 'Phnom Penh, Russian Market area',
            ],
            [
                'supplier_name' => 'Angkor Food Supply',
                'contact_name'  => 'Rithy Sambath',
                'phone'         => '092 111 222',
                'email'         => 'contact@angkorfood.com',
                'address'       => 'Siem Reap, Pub Street',
            ],
            [
                'supplier_name' => 'GreenFresh Produce',
                'contact_name'  => 'Nita Sophea',
                'phone'         => '098 333 444',
                'email'         => 'sales@greenfresh.com',
                'address'       => 'Phnom Penh, Central Market',
            ],
            [
                'supplier_name' => 'Mekong Packaging Solutions',
                'contact_name'  => 'Khemra Heng',
                'phone'         => '010 555 666',
                'email'         => 'info@mekongpack.com.kh',
                'address'       => 'Phnom Penh, Sen Sok',
            ],
            [
                'supplier_name' => 'Monorom Tea Leaf Trading',
                'contact_name'  => 'Vanna Keo',
                'phone'         => '089 777 888',
                'email'         => 'orders@monoromtea.com',
                'address'       => 'Mondulkiri, Sen Monorom',
            ],
            [
                'supplier_name' => 'Campura Pure Water Co.',
                'contact_name'  => 'Chanthy Bun',
                'phone'         => '015 999 000',
                'email'         => 'sales@campurawater.com',
                'address'       => 'Kandal, Takhmao',
            ],
            [
                'supplier_name' => 'Bokor Organic Syrup & Sweeteners',
                'contact_name'  => 'Srey Leak',
                'phone'         => '069 123 456',
                'email'         => 'contact@bokorsyrup.com',
                'address'       => 'Kampot City, Riverfront',
            ],
            [
                'supplier_name' => 'Siam Flavors & Spice Imports',
                'contact_name'  => 'Arun Chai',
                'phone'         => '096 234 567',
                'email'         => 'support@siamflavors.com',
                'address'       => 'Phnom Penh, Toul Kork',
            ],
            [
                'supplier_name' => 'Banteay Ice & Cold Chain Logistics',
                'contact_name'  => 'Chea Vibol',
                'phone'         => '088 345 6789',
                'email'         => 'logistics@banteayice.com',
                'address'       => 'Phnom Penh, Chom Chao',
            ],
            [
                'supplier_name' => 'Highland Dairy Products',
                'contact_name'  => 'Kim Srun',
                'phone'         => '078 456 789',
                'email'         => 'supply@highlanddairy.com.kh',
                'address'       => 'Battambang, Riverside',
            ],
            [
                'supplier_name' => 'Phnom Penh Barista Gear & Tech',
                'contact_name'  => 'Ratanak Ouk',
                'phone'         => '011 678 901',
                'email'         => 'sales@baristagear.kh',
                'address'       => 'Phnom Penh, BKK1',
            ],
            [
                'supplier_name' => 'Sunrise Fruit & Juice Co.',
                'contact_name'  => 'Phalla Chhea',
                'phone'         => '093 789 012',
                'email'         => 'orders@sunrisefruit.com',
                'address'       => 'Kampong Cham, City Center',
            ],
            [
                'supplier_name' => 'Lotus Eco Paper & Napkins',
                'contact_name'  => 'Thyda Nguon',
                'phone'         => '085 890 123',
                'email'         => 'contact@lotuseco.com.kh',
                'address'       => 'Phnom Penh, Chroy Changvar',
            ],
        ];

        foreach ($suppliers as $supplierData) {
            Supplier::create($supplierData);
        }
    }
}