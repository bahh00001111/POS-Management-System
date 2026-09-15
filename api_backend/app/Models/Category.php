<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    // កំណត់ Primary Key ឱ្យត្រូវនឹង Column ក្នុង Database របស់អ្នក
    protected $primaryKey = 'category_id';

    protected $fillable = ['category_name', 'image', 'is_professional'];

    protected $casts = [
        'is_professional' => 'boolean',
    ];

    public function products() 
    { 
        // បញ្ជាក់ Foreign Key (category_id) និង Local Key (category_id) ឱ្យច្បាស់
        return $this->hasMany(Product::class, 'category_id', 'category_id');
    }
}