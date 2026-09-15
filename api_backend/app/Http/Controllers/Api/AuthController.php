<?php

namespace App\Http\Controllers\Api; // ត្រូវប្រាកដថាឈ្មោះ Class គឺ AuthController និងមាន \Api

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    // 1st–3rd failed attempts are allowed; the 4th attempt onwards is locked.
    private const MAX_ATTEMPTS = 3;

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        // Rate limit key based on the client IP (matches the 'login' limiter in AppServiceProvider)
        $key = 'login_attempts:' . $request->ip();

        // If the IP has reached the attempt limit, it is locked — return 429 with the countdown.
        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            return response()->json([
                'status'  => 'locked',
                'message' => 'Too many failed attempts. Please wait.',
                'seconds' => RateLimiter::availableIn($key),
            ], 429);
        }

        $user = User::where('username', $request->username)->first();

        // Failed authentication → record the failed attempt with an escalating lock window
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            $newAttempts = RateLimiter::attempts($key) + 1;
            RateLimiter::hit($key, self::lockDecayFor($newAttempts));

            return response()->json([
                'status'  => 'error',
                'message' => 'Invalid username or password',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Your account is disabled',
            ], 403);
        }

        // Successful authentication → clear all failed attempts for this IP
        RateLimiter::clear($key);

        // Update last_login_at (record the timestamp in the users table upon successful login)
        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'       => 'success',
            'message'      => 'Login successful',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => [
                'user_id'   => $user->user_id,
                'username'  => $user->username,
                'full_name' => $user->full_name,
                'email'     => $user->email,
                'phone'     => $user->phone,
                'avatar'    => $user->avatar,
                'roles'     => $user->roles->pluck('role_name'),
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logged out successfully'
        ], 200);
    }

    /**
     * Escalating lock window based on the number of consecutive failed attempts:
     *   4th failed attempt  → 10 seconds
     *   5th failed attempt  → 20 seconds
     *   6th attempt and up  → 60 seconds
     */
    private function lockDecayFor(int $attempts): int
    {
        if ($attempts >= 6) {
            return 60;
        }
        if ($attempts === 5) {
            return 20;
        }
        if ($attempts === 4) {
            return 10;
        }
        return 10;
    }
}