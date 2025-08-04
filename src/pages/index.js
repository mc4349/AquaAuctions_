// src/pages/index.js

import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, login, logout, loading } = useAuth();

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to AquaAuctions</h1>

      {!user ? (
        <>
          <p className="mb-4">Please sign in to start bidding or streaming.</p>
          <button
            onClick={login}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with Google
          </button>
        </>
      ) : (
        <>
          <p className="mb-4">Welcome, {user.displayName}!</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.href = "/live"}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              View Livestream
            </button>
            <button
              onClick={() => window.location.href = "/stream"}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Start Streaming
            </button>
          </div>
          <button
            onClick={logout}
            className="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </>
      )}
    </div>
  );
}
