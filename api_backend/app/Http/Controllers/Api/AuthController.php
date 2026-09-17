<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /** Failed attempts allowed before the first lockout. */
    private const MAX_ATTEMPTS = 3;

    /** Escalating lock durations: 4th → 10s, 5th → 20s, 6th+ → 60s. */
    private const LOCK_10_SECONDS = 10;
    private const LOCK_20_SECONDS = 20;
    private const LOCK_60_SECONDS = 60;

    /** Long pause between failures resets the streak so returning users start clean. */
    private const IDLE_RESET_SECONDS = 600;

    /** How long to keep tracking the streak (must exceed the longest lock). */
    private const COUNTER_TTL_SECONDS = 3600;

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        // Create a unique key per user + IP combination
        $key = 'login_attempts:' . Str::lower($request->input('username')) . '|' . $request->ip();

        // 1. Still locked out? Fail fast with the exact remaining seconds.
        $seconds = (int) Cache::get($key . ':lock_until', 0) - time();
        if ($seconds > 0) {
            return response()->json([
                'status'  => 'locked',
                'message' => "Too many failed attempts. Please wait {$seconds} seconds.",
                'seconds' => $seconds,
            ], 429);
        }

        $user = User::where('username', $request->username)->first();

        // 2. Invalid username or password → register a failure and apply progressive lockout
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            $attempts = (int) Cache::get($key, 0);

            // Reset the streak after a long pause so users are not locked on a single typo.
            $lastFailure = (int) Cache::get($key . ':last_failure', 0);
            if ($lastFailure === 0 || time() - $lastFailure >= self::IDLE_RESET_SECONDS) {
                $attempts = 0;
            }

            $attempts++;
            Cache::put($key, $attempts, self::COUNTER_TTL_SECONDS);
            Cache::put($key . ':last_failure', time(), self::COUNTER_TTL_SECONDS);

            // Exceeded the limit → lock with an escalating duration.
            if ($attempts > self::MAX_ATTEMPTS) {
                $lockSeconds = self::lockDurationFor($attempts);
                Cache::put($key . ':lock_until', time() + $lockSeconds, $lockSeconds);

                return response()->json([
                    'status'        => 'locked',
                    'message'       => "Too many failed attempts. Try again in {$lockSeconds} seconds.",
                    'seconds'       => $lockSeconds,
                    'attempts_left' => 0,
                ], 429);
            }

            return response()->json([
                'status'        => 'error',
                'message'       => 'Invalid username or password',
                'attempts_left' => self::MAX_ATTEMPTS - $attempts,
            ], 401);
        }

        // 3. Check active account status
        if (!$user->is_active) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Your account is disabled',
            ], 403);
        }

        // 4. Authentication successful: reset progressive lockout tracking
        self::clearAttempts($key);

        // Record the login timestamp
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
                'roles'     => $user->roles ? $user->roles->pluck('role_name') : [],
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        // Delete current token (supports Sanctum)
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logged out successfully'
        ], 200);
    }

    /**
     * Escalating lock window based on consecutive failed attempts:
     * 4th → 10s, 5th → 20s, 6th+ → 60s.
     */
    private static function lockDurationFor(int $attempts): int
    {
        return match (true) {
            $attempts >= 6     => self::LOCK_60_SECONDS,
            $attempts === 5    => self::LOCK_20_SECONDS,
            default            => self::LOCK_10_SECONDS,
        };
    }

    /**
     * Reset all lockout tracking for the given key.
     */
    private static function clearAttempts(string $key): void
    {
        Cache::forget($key);
        Cache::forget($key . ':last_failure');
        Cache::forget($key . ':lock_until');
    }
}