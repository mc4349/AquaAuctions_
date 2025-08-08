// src/components/DarkModeToggle.js

import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark";
    setEnabled(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const newMode = !enabled;
    setEnabled(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  return (
    <button
      onClick={toggle}
      className="text-sm hover:text-yellow-400 transition"
    >
      {enabled ? "ðŸŒ™ Dark" : "â˜€ï¸ Light"}
    </button>
  );
}
