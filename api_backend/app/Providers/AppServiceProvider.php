<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Custom dynamic login rate limiter — cache key is based on the client IP.
        // The dynamic escalating lock (10s / 20s / 60s) is applied per failed attempt
        // inside AuthController::login() using RateLimiter::hit() with a computed decay.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(3)->by('login_attempts:' . $request->ip());
        });
    }
}