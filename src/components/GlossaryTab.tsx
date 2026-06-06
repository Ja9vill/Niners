import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export const GlossaryTab = () => {
  const [message, setMessage] = useState("");

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      });

      const data = await response.json();
      setMessage(`Logged in as ${data.email || result.user.email || "user"}`);
    } catch (error: any) {
      setMessage(error?.message || "Login failed");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMessage("Logged out");
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold mb-4">NINE Talent Management Dashboard</h1>
        <p className="text-slate-400 mb-6">
          Firebase auth recovery test screen.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleGoogleLogin}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
          >
            Sign in with Google
          </button>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-slate-700 px-4 py-2 font-medium hover:bg-slate-600"
          >
            Sign out
          </button>
        </div>

        {message ? <p className="mt-6 text-sm text-emerald-400">{message}</p> : null}
      </div>
    </div>
  );
}