<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderDetail extends Model
{
    use HasFactory;

    // កំណត់ Primary Key ឈ្មោះ order_detail_id
    protected $primaryKey = 'order_detail_id';

    protected $fillable = [
        'order_id', 
        'product_id', 
        'quantity', 
        'unit_price',
        'subtotal',
        'size',
        'sugar_level',
        'remarks'
    ];

    // ភ្ជាប់ត្រឡប់ទៅ Order
    public function order() 
    { 
        return $this->belongsTo(Order::class, 'order_id', 'order_id'); 
    }

    // ភ្ជាប់ទៅកាន់ Product
    public function product() 
    { 
        return $this->belongsTo(Product::class, 'product_id', 'product_id'); 
    }
}