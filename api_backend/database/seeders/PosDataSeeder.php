<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class PosDataSeeder extends Seeder
{
    private array $professionalCategories = [
        'Coffee', 'Tea', 'Cold Drinks', 'Hot Drinks'
    ];

    private array $categories = [
        'Coffee' => [
            'Espresso' => 2.00, 'Americano' => 2.00, 'Cappuccino' => 3.00,
            'Caffe Latte' => 3.25, 'Iced Latte' => 2.50,
        ],
        'Tea' => [
            'Green Tea' => 2.25, 'Black Tea' => 2.00, 'Matcha Latte' => 3.50,
        ],
        'Pastries' => [
            'Butter Croissant' => 2.50, 'Chocolate Croissant' => 3.00,
        ],
    ];

    public function run(): void
    {
        $supplierIds = Supplier::pluck('supplier_id')->toArray();

        $index = 0;
        foreach ($this->categories as $catName => $products) {
            $category = Category::updateOrCreate(
                ['category_name' => $catName],
                [
                    'image'           => null,
                    'is_professional' => in_array($catName, $this->professionalCategories, true),
                ]
            );
            $catId = $category->category_id;
            $isProfessional = in_array($catName, $this->professionalCategories, true);

            foreach ($products as $productName => $price) {
                $index++;
                $stock = (($index % 5) + 1) * 25;
                $supplierId = !empty($supplierIds) ? $supplierIds[array_rand($supplierIds)] : null;

                Product::updateOrCreate(
                    ['product_name' => $productName],
                    [
                        'category_id'     => $catId,
                        'price'           => $price,
                        'stock'           => $stock,
                        'supplier_id'     => $supplierId,
                        'image'           => null,
                        'is_professional' => $isProfessional,
                    ]
                );
            }
        }
    }
}