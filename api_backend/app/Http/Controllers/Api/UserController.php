<?php

namespace App\Http\Controllers\Api; // ត្រូវប្រាកដថាមាន \Api ត្រង់នេះ

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index()
    {
        return response()->json([
            'status' => 'success',
            'data'   => User::with('roles')->get()
        ], 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'username'  => 'required|string|max:255|unique:users,username',
            'full_name' => 'required|string|max:255',
            'password'  => 'required|string|min:6', // លុប confirmed ចេញ ប្រសិនបើ UI គ្មាន Password Confirmation
            'email'     => 'nullable|string|email|max:255|unique:users,email',
            'phone'     => 'nullable|string|max:20',
            'pin_code'  => 'nullable|string|max:6',
            'avatar'    => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'is_active' => 'boolean',
            'is_professional' => 'boolean',
            'role_id'   => 'required|exists:roles,role_id', // ដូរមកជា ID តែមួយវិញ
        ]);

        $user = DB::transaction(function () use ($validated, $request) {
            $avatarPath = null;
            if ($request->hasFile('avatar')) {
                $avatarPath = $request->file('avatar')->store('avatars', 'public');
            }

            $user = User::create([
                'username'      => $validated['username'],
                'full_name'     => $validated['full_name'],
                'password_hash' => Hash::make($validated['password']),
                'email'         => $validated['email'] ?? null,
                'phone'         => $validated['phone'] ?? null,
                'pin_code'      => !empty($validated['pin_code']) ? Hash::make($validated['pin_code']) : null,
                'avatar'        => $avatarPath,
                'is_active'     => $request->input('is_active', true),
                'is_professional' => $request->boolean('is_professional'),
            ]);

            // Attaching តែមួយ Role
            $user->roles()->attach($validated['role_id']);

            return $user;
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'User created successfully',
            'data'    => $user->load('roles')
        ], 201);
    }

    public function show($id)
    {
        $user = User::with('roles')->find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User not found'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $user], 200);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User not found'], 404);
        }

        $validated = $request->validate([
            'username'  => 'sometimes|required|string|max:255|unique:users,username,' . $id . ',user_id',
            'full_name' => 'sometimes|required|string|max:255',
            'password'  => 'nullable|string|min:6',
            'email'     => 'nullable|string|email|max:255|unique:users,email,' . $id . ',user_id',
            'phone'     => 'nullable|string|max:20',
            'pin_code'  => 'nullable|string|max:6',
            'avatar'    => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'is_active' => 'nullable|boolean',
            'is_professional' => 'nullable|boolean',
            'role_id'   => 'nullable|exists:roles,role_id',
            'role_ids'   => 'nullable|array',
            'role_ids.*' => 'exists:roles,role_id',
        ]);

        if (isset($validated['username']))  $user->username = $validated['username'];
        if (isset($validated['full_name'])) $user->full_name = $validated['full_name'];
        if (isset($validated['email']))     $user->email = $validated['email'];
        if (isset($validated['phone']))     $user->phone = $validated['phone'];
        if (isset($validated['is_active'])) $user->is_active = $validated['is_active'];
        if (isset($validated['is_professional'])) $user->is_professional = $validated['is_professional'];

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $user->avatar = $request->file('avatar')->store('avatars', 'public');
        }

        if (!empty($validated['password'])) {
            $user->password_hash = Hash::make($validated['password']);
        }

        if (!empty($validated['pin_code'])) {
            $user->pin_code = Hash::make($validated['pin_code']);
        }

        $user->save();

        if (isset($validated['role_id'])) {
            $user->roles()->sync([$validated['role_id']]);
        } elseif (isset($validated['role_ids'])) {
            $user->roles()->sync($validated['role_ids']);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'User updated successfully',
            'data'    => $user->load('roles')
        ], 200);
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User not found'], 404);
        }

        $user->roles()->detach();
        $user->delete();

        return response()->json(['status' => 'success', 'message' => 'User deleted successfully'], 200);
    }
}
