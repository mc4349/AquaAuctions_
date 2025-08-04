// src/components/BidPanel.js

import { useEffect, useState } from "react";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { auth } from "@/firebase/firebaseClient";

export default function BidPanel() {
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState(null);

  useEffect(() => {
    const db = getDatabase();
    const bidRef = ref(db, "auction/current");

    const unsubscribe = onValue(bidRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCurrentBid(data.amount);
        setCurrentBidder(data.name);
      }
    });

    return () => unsubscribe();
  }, []);

  const placeBid = () => {
    const db = getDatabase();
    const bidRef = ref(db, "auction/current");

    const newBid = currentBid + 5;

    set(bidRef, {
      amount: newBid,
      name: auth.currentUser.displayName,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="bg-white text-black shadow p-4 rounded mt-6 max-w-md w-full text-center">
      <h2 className="text-xl font-semibold mb-2">💸 Live Bidding</h2>
      <p className="text-lg">
        Current Bid: <span className="font-bold">${currentBid}</span>
      </p>
      <p className="text-sm mb-4 text-gray-600">
        {currentBidder ? `Highest Bidder: ${currentBidder}` : "No bids yet"}
      </p>
      <button
        onClick={placeBid}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Place Bid (+$5)
      </button>
    </div>
  );
}
