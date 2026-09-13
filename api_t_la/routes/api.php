<?php


use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KhqrController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// 1. Public Route (មិនទាមទារ Bearer Token)
Route::post('/login', [AuthController::class, 'login']);

// Webhook for payment status updates from the Bakong Open API backend.
// Public by design - the callback URL is registered with Bakong.
Route::post('/khqr/callback', [KhqrController::class, 'callback']);

// 2. Protected Routes (ទាមទារ Bearer Token)
Route::middleware('auth:sanctum')->group(function () {

    // Auth Actions
    Route::post('/logout', [AuthController::class, 'logout']);

    // Sales & Print + Menu Read (Admin, Manager, Cashier)
    Route::middleware('role:Admin,Manager,Cashier')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::post('/khqr/payload', [KhqrController::class, 'payload']);
        Route::get('/khqr/status', [KhqrController::class, 'status']);
    });

    // Manage Menu, Price & Inventory (Admin, Manager)
    Route::middleware('role:Admin,Manager')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::get('/categories/{id}', [CategoryController::class, 'show']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);
        Route::put('/settings', [SettingController::class, 'update']);
    });

    // Manage Staff & System Configuration (Admin Only)
    Route::middleware('role:Admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });

});