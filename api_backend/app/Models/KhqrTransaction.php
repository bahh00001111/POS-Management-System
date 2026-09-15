<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KhqrTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'reference',
        'amount',
        'currency',
        'status',
        'payload',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    // KHQR transaction នេះកំពុងបង់ប្រាក់សម្រាប់ Order ណា
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }
}