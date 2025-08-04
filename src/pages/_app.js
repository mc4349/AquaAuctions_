// src/pages/_app.js

import "@/styles/globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-black text-white">
        <NavBar />
        <main className="flex-grow">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
