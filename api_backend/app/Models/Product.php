<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    // ប្រាប់ Eloquent ថា Primary Key ឈ្មោះ product_id
    protected $primaryKey = 'product_id';

    protected $fillable = [
        'category_id', 
        'product_name',
        'price', 
        'stock',
        'supplier_id',
        'image',
        'is_professional'
    ];

    protected $casts = [
        'is_professional' => 'boolean',
        'stock' => 'integer',
    ];

    public function category() 
    { 
        return $this->belongsTo(Category::class, 'category_id', 'category_id'); 
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }
}