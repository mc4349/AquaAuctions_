// pages/login.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const signInAndRedirect = async () => {
      if (!user) {
        await login();
      }
      router.replace("/");
    };

    signInAndRedirect();
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <p>Redirecting to Google Sign-In...</p>
    </div>
  );
}
