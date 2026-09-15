<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $table = 'users';
    protected $primaryKey = 'user_id';

    protected $fillable = [
        'username',
        'password_hash',
        'full_name',
        'email',
        'phone',
        'pin_code',
        'avatar',
        'is_active',
        'is_professional',
        'last_login_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_professional' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    protected $hidden = [
        'password_hash',
        'pin_code',
    ];

    /**
     * ប្រាប់ Laravel ឱ្យប្រើប្រាស់ field 'password_hash' ជំនួសឱ្យ 'password' សម្រាប់ Auth
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id');
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles->pluck('role_name')->intersect($roles)->isNotEmpty();
    }
}