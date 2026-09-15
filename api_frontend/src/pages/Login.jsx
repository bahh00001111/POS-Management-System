import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Coffee, User, Lock, LogIn, Loader2, AlertOctagon, AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Rate-limit lockout — HTTP 429 from the backend's dynamic login rate limiter
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Show/Hide password toggle
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Live countdown while locked — clears the interval on 0 or unmount.
  useEffect(() => {
    if (!isLocked) return;

    const id = setInterval(() => {
      setLockCountdown((s) => {
        if (s <= 1) {
          clearInterval(id);
          setIsLocked(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isLocked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // 429 → extract the backend lock seconds and start the countdown
      if (err.response?.status === 429) {
        const seconds = Number(err.response.data?.seconds) || 60;
        setLockCountdown(seconds);
        setIsLocked(true);
        setError("");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Invalid username or password.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Disable the form entirely during lockout
  const formDisabled = isLocked || loading;

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-fit p-4 bg-coffee-100 text-coffee-600 rounded-2xl">
              <Coffee size={32} />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Coffee POS</h1>
            <p className="text-sm text-stone-500">
              Sign in to the management system
            </p>
          </div>

          {/* Red Rate-Limit Alert Banner with live countdown */}
          {isLocked && (
            <div
              role="alert"
              className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3"
            >
              <AlertOctagon
                size={20}
                className="shrink-0 text-red-500 animate-pulse"
              />
              <p className="text-sm font-semibold flex-1">
                Too many failed attempts. Please wait{" "}
                <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-bold tabular-nums">
                  {lockCountdown}s
                </span>
              </p>
            </div>
          )}

          {/* Generic error — red banner, same style as the lock alert */}
          {error && !isLocked && (
            <div
              role="alert"
              className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3"
            >
              <AlertTriangle size={20} className="shrink-0 text-red-500" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-3 text-stone-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  autoFocus={!isLocked}
                  disabled={isLocked}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-stone-50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 text-stone-400"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLocked}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-stone-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={isLocked}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer focus:outline-none focus:ring-0 focus:border-none disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Khmer hint shown while locked */}
            {isLocked && (
              <p className="text-center text-xs text-red-400 font-medium">
                ងាកក្រោយវិញ {lockCountdown} វិនាទីអាចព្យាយាមម្ដងទៀតបាន
              </p>
            )}

            <button
              type="submit"
              disabled={formDisabled}
              className="w-full py-3 bg-coffee-600 hover:bg-coffee-700 disabled:bg-stone-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}