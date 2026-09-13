import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Coffee, User, Lock, LogIn, Loader2 } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Invalid username or password.",
      );
    } finally {
      setLoading(false);
    }
  };

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

          {error && (
            <div className="bg-coffee-50 text-coffee-600 text-sm font-medium px-4 py-3 rounded-xl border border-coffee-100">
              {error}
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
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-coffee-600 hover:bg-coffee-700 disabled:bg-stone-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition"
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
