<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        // បង្ហាញតែការជូនដំណឹងដែលមិនទាន់អានប៉ុណ្ណោះ
        $notifications = SystemNotification::with(['product', 'supplier'])
            ->whereNull('read_at')
            ->orderByDesc('created_at')
            ->paginate($this->resolvePerPage($request));

        return response()->json([
            'message' => 'Notifications retrieved successfully',
            'data' => $notifications,
        ], 200);
    }

    public function markRead($id)
    {
        $notification = SystemNotification::findOrFail($id);
        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Notification marked as read',
            'data' => $notification,
        ], 200);
    }

    public function markAllRead()
    {
        SystemNotification::whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read',
        ], 200);
    }

    public function destroy($id)
    {
        SystemNotification::where('notification_id', $id)->delete();

        return response()->json([
            'message' => 'Notification deleted successfully',
        ], 200);
    }
}