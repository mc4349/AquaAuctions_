import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "./AuthProvider";
import DarkModeToggle from "./DarkModeToggle";
import { useState } from "react";

export default function NavBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Live", href: "/live" },
    { label: "Stream", href: "/stream" },
    { label: "Orders", href: "/order-history" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  const isActive = (href) => router.pathname === href;

  return (
    <nav className="bg-gray-900 text-white w-full shadow-md px-6 py-4">
      <div className="flex justify-between items-center relative">
        <Link href="/" className="text-2xl font-bold hover:text-blue-400">
          ðŸŒŠ AquaAuctions
        </Link>

        <div className="sm:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="focus:outline-none text-xl"
            aria-label="Toggle navigation"
          >
            â˜°
          </button>
        </div>

        {/* Desktop Menu */}
        <div className="hidden sm:flex space-x-6 items-center text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-blue-300 ${
                isActive(link.href) ? "text-blue-400 font-semibold" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}

          <DarkModeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="hover:text-purple-300 focus:outline-none"
              >
                {user.displayName || "Profile"}
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 shadow rounded py-2 z-50">
                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 text-sm hover:bg-gray-700"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hover:text-green-400">Login</Link>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden mt-4 flex flex-col space-y-2 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block hover:text-blue-300 ${
                isActive(link.href) ? "text-blue-400 font-semibold" : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <DarkModeToggle />

          {user ? (
            <>
              <Link
                href="/profile"
                className="hover:text-purple-400"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="hover:text-red-400 text-left"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="hover:text-green-400"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
