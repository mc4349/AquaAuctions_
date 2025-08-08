// src/components/Footer.js

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm py-4 px-6 mt-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>&copy; {new Date().getFullYear()} AquaAuctions</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
