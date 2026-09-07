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
        'image',
        'is_professional'
    ];

    protected $casts = [
        'is_professional' => 'boolean',
    ];

    public function category() 
    { 
        return $this->belongsTo(Category::class, 'category_id', 'category_id'); 
    }
}