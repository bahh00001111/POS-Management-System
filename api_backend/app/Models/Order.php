<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    // កំណត់ Primary Key ឈ្មោះ order_id
    protected $primaryKey = 'order_id';

    protected $fillable = [
        'invoice_number',
        'queue_number',
        'order_type',
        'order_status',
        'payment_status',
        'total_amount',
        'subtotal',
        'discount_type',
        'discount_value',
        'discount_amount',
        'delivery_method',
        'delivery_fee',
        'customer_name',
        'phone_number',
        'delivery_address',
        'delivery_platform',
        'external_order_id',
        'user_id',
        'order_date'
    ];

    protected $casts = [
        'subtotal' => 'float',
        'discount_value' => 'float',
        'discount_amount' => 'float',
        'delivery_fee' => 'float',
        'total_amount' => 'float',
    ];

    // Order មួយមាន OrderDetail ច្រើន
    public function details() 
    { 
        return $this->hasMany(OrderDetail::class, 'order_id', 'order_id'); 
    }

    // ភ្ជាប់ទៅកាន់ Cashier/User
    public function user() 
    { 
        return $this->belongsTo(User::class, 'user_id', 'user_id'); 
    }
}