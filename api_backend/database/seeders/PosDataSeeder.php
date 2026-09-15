<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class PosDataSeeder extends Seeder
{
    private array $professionalCategories = [
        'Coffee', 'Tea', 'Hot Drinks', 'Cold Drinks', 'Frappes & Blended', 
        'Smoothies & Juices', 'Signature Drinks', 'Bubble Tea'
    ];

    private array $categories = [
        'Coffee' => [
            'Espresso' => 2.00, 'Americano' => 2.00, 'Cappuccino' => 3.00,
            'Caffe Latte' => 3.25, 'Iced Latte' => 2.50, 'Mocha' => 3.50,
            'Flat White' => 3.40, 'Caramel Macchiato' => 3.75, 'Affogato' => 3.90,
        ],
        'Tea' => [
            'Green Tea' => 2.25, 'Black Tea' => 2.00, 'Earl Grey Tea' => 2.40,
            'Jasmine Tea' => 2.30, 'Chai Latte' => 3.10, 'Matcha Latte' => 3.50,
            'Peppermint Tea' => 2.20, 'Oolong Tea' => 2.60,
        ],
        'Pastries' => [
            'Butter Croissant' => 2.50, 'Chocolate Croissant' => 3.00, 'Blueberry Muffin' => 2.80,
            'Cinnamon Roll' => 3.20, 'Apple Turnover' => 2.90, 'Danish Pastry' => 2.70,
            'Cheese Danish' => 3.10, 'Pain au Chocolat' => 3.30, 'Banana Bread Slice' => 2.60,
        ],
        'Sandwiches' => [
            'Chicken Sandwich' => 5.50, 'Tuna Sandwich' => 5.00, 'Club Sandwich' => 6.00,
            'BLT Sandwich' => 5.80, 'Grilled Cheese' => 4.50, 'Veggie Sandwich' => 4.80,
            'Ham & Cheese Sandwich' => 5.20, 'Egg Salad Sandwich' => 4.90,
        ],
        'Cold Drinks' => [
            'Iced Coffee' => 3.00, 'Iced Americano' => 2.80, 'Cold Brew' => 3.50,
            'Lemonade' => 2.50, 'Iced Chocolate' => 3.60, 'Sparkling Water' => 1.80, 
            'Berry Cooler' => 3.30,
        ],
        'Hot Drinks' => [
            'Hot Chocolate' => 3.20, 'Hot Tea' => 2.00, 'Hot Espresso' => 1.90,
            'Hot Macchiato' => 3.30, 'Caramel Hot Drink' => 3.60, 'Vanilla Steamer' => 2.80,
            'Hot Chai' => 2.90, 'Mint Hot Chocolate' => 3.40,
        ],
        'Breakfast' => [
            'Breakfast Wrap' => 5.20, 'Egg & Toast' => 4.00, 'Pancakes' => 5.80,
            'Oatmeal Bowl' => 4.50, 'Bagel with Cream Cheese' => 3.80, 'Breakfast Burrito' => 5.50,
            'Muffin & Coffee Combo' => 4.90, 'Yogurt Parfait' => 4.20, 'Smoked Salmon Bagel' => 6.50,
        ],
        'Snacks' => [
            'Potato Chips' => 1.80, 'Pretzel' => 2.20, 'Cookie Jar' => 2.00,
            'Granola Bar' => 2.50, 'Popcorn' => 2.30, 'Nuts Mix' => 3.00,
            'Fruit Cup' => 2.80, 'Trail Mix' => 2.90,
        ],
        'Desserts' => [
            'Cheesecake' => 4.80, 'Chocolate Cake' => 4.50, 'Tiramisu' => 5.00,
            'Brownie' => 3.20, 'Apple Pie' => 4.00, 'Cupcake' => 3.50,
            'Ice Cream Scoop' => 2.80, 'Panna Cotta' => 4.20, 'Lava Cake' => 4.90,
        ],
        'Specials' => [
            'Seasonal Latte' => 4.00, 'Chef Special Burger' => 7.50, 'Limited Edition Frappe' => 4.80,
            'Weekend Special Soup' => 4.20, 'Signature Blend Coffee' => 3.80, 'Special Combo Meal' => 8.90,
            'Daily Dessert Special' => 4.00, 'Holiday Special Drink' => 4.50,
        ],
        'Frappes & Blended' => [
            'Coffee Frappe' => 4.25, 'Caramel Blended' => 4.50, 'Matcha Blended' => 4.75,
            'Mocha Frappe' => 4.50, 'Vanilla Bean Blended' => 4.30,
        ],
        'Smoothies & Juices' => [
            'Mango Passion Fruit Smoothie' => 4.50, 'Strawberry Banana Smoothie' => 4.20,
            'Fresh Orange Juice' => 3.50, 'Green Detox Juice' => 4.80, 'Watermelon Splash' => 3.20,
        ],
        'Bubble Tea' => [
            'Classic Milk Tea w/ Pearls' => 3.50, 'Brown Sugar Boba Milk' => 4.00,
            'Taro Milk Tea' => 3.80, 'Thai Milk Tea' => 3.60, 'Passion Fruit Green Tea' => 3.40,
        ],
        'Bakery & Bread' => [
            'Sourdough Loaf' => 4.00, 'Baguette' => 2.20, 'Garlic Bread Toast' => 3.00,
            'Whole Wheat Bread' => 3.50,
        ],
        'Salads & Healthy' => [
            'Caesar Salad' => 6.50, 'Greek Salad' => 6.00, 'Avocado Toast' => 5.50,
            'Chicken Quinoa Bowl' => 7.20,
        ],
        'Pasta & Mains' => [
            'Spaghetti Carbonara' => 7.50, 'Penne Arrabbiata' => 6.80, 'Creamy Mushroom Pasta' => 7.00,
            'Beef Lasagna' => 8.50,
        ],
        'Bottled Drinks' => [
            'Mineral Water 500ml' => 1.00, 'Sparkling Soda' => 2.00, 'Cold Brew Bottled' => 4.00,
            'Kombucha' => 4.50,
        ],
        'Ice Creams & Gelato' => [
            'Vanilla Gelato' => 3.00, 'Dark Chocolate Gelato' => 3.20, 'Pistachio Scoop' => 3.50,
            'Mango Sorbet' => 3.00,
        ],
        'Merchandise & Coffee Beans' => [
            'House Blend Beans 250g' => 12.00, 'Espresso Roast Beans 500g' => 22.00,
            'Cafe Ceramic Tumbler' => 15.00, 'Eco Tote Bag' => 8.00,
        ],
        'Signature Drinks' => [
            'Khmer Coconut Coffee' => 4.00, 'Salted Cream Cold Brew' => 4.20,
            'Pandan Latte' => 3.80, 'Honeycomb Iced Latte' => 4.50,
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