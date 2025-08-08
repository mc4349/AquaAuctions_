// pages/index.js

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const reefFacts = [
  "Ã°Å¸Å’Å  Coral reefs support 25% of all marine life.",
  "Ã°Å¸ÂÂ  Over 4,000 species of fish live in coral reefs.",
  "Ã°Å¸Å’Â± Coral can grow as little as 1 inch per year.",
  "Ã°Å¸â€Â¬ Reefs help in medical research for cancer and arthritis.",
  "Ã¢Å¡Â Ã¯Â¸Â 50% of reefs have been lost in the last 30 years."
];

export default function Home() {
  const factOfTheDay = reefFacts[new Date().getDate() % reefFacts.length];
  const { user, login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white px-6 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Ã°Å¸Å’Å  Welcome to AquaAuctions
        </h1>
        <p className="text-xl text-gray-200 mb-6">
          Bid live on rare coral, saltwater fish, and reef gear Ã¢â‚¬â€ all from real sellers in the hobbyist community.
        </p>

        <div className="bg-indigo-800 rounded-lg px-6 py-4 mb-8 shadow-lg">
          <p className="text-lg italic">{factOfTheDay}</p>
        </div>

        {!user ? (
          <div className="flex justify-center mb-10">
            <button
              onClick={login}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-lg font-medium"
            >
              Ã°Å¸â€Â Sign in with Google to Get Started
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-6 mb-10">
            <Link href="/live">
              <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-lg font-medium">
                Ã°Å¸â€Â´ View Live Auctions
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-lg font-medium">
                Ã°Å¸â€œÂ¦ Start Selling
              </button>
            </Link>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Ã°Å¸Å’Å¸ Trending Auctions</h2>
          <p className="text-gray-400">Coming soon: Show previews of popular livestreams here.</p>
        </div>
      </div>
    </div>
  );
}
