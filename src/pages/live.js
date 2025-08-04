// src/pages/live.js

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  collection,
  getDoc,
} from "firebase/firestore";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "659ca74bd1ef43f8bd76eee364741b32";
const CHANNEL = "aquaauctions";
const TOKEN = null;

export default function Live() {
  const { user, logout } = useAuth();
  const videoRef = useRef(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [address, setAddress] = useState("");
  const [cardInfo, setCardInfo] = useState("");

  useEffect(() => {
    const initAgoraPlayer = async () => {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await client.setClientRole("audience");
      await client.join(APP_ID, CHANNEL, TOKEN || null, null);

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          user.videoTrack.play(videoRef.current);
        }
        if (mediaType === "audio") {
          user.audioTrack.play();
        }
      });
    };

    initAgoraPlayer();
  }, []);

  useEffect(() => {
    const streamRef = doc(db, "Livestreams", "testStream");
    const unsubscribe = onSnapshot(streamRef, (snapshot) => {
      const data = snapshot.data();
      if (!data?.products) return;

      const active = data.products.find((p) => p.isActive);
      setActiveProduct(active || null);

      if (active?.endsAt && Date.now() > active.endsAt) {
        setShowCheckoutPrompt(true);
      } else {
        setShowCheckoutPrompt(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeProduct?.endsAt) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.floor((activeProduct.endsAt - Date.now()) / 1000)
      );
      setCountdown(secondsLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeProduct]);

  const placeBid = async () => {
    const bid = parseFloat(bidAmount);
    if (!activeProduct || isNaN(bid)) {
      alert("Enter a valid bid amount.");
      return;
    }

    if (bid <= (activeProduct.highestBid || activeProduct.price)) {
      alert("Bid must be higher than the current highest bid.");
      return;
    }

    try {
      const streamRef = doc(db, "Livestreams", "testStream");
      const streamSnap = await getDoc(streamRef);
      const products = streamSnap.data().products;

      const updatedProducts = products.map((p) =>
        p.addedAt === activeProduct.addedAt
          ? { ...p, highestBid: bid, highestBidder: user?.email || "Anonymous" }
          : p
      );

      await updateDoc(streamRef, { products: updatedProducts });
      setBidAmount("");
    } catch (err) {
      console.error("❌ Failed to place bid:", err.message);
      alert("Bid failed. Check console for details.");
    }
  };

  const handleConfirmPayment = async () => {
    if (!address || !cardInfo) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      await addDoc(collection(db, "Orders"), {
        product: activeProduct,
        buyer: user?.email || "Anonymous",
        shippingAddress: address,
        cardUsed: cardInfo,
        createdAt: Date.now(),
      });
      alert("✅ Order submitted!");
      setShowCheckoutPrompt(false);
      setActiveProduct(null);
      setAddress("");
      setCardInfo("");
    } catch (err) {
      console.error("Order failed", err);
      alert("❌ Failed to place order");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <h1 className="text-2xl font-bold mb-4">📺 Livestream Viewer</h1>

      <div
        ref={videoRef}
        className="w-full max-w-xl h-64 bg-black rounded-lg shadow mb-4"
      ></div>

      <div className="bg-gray-800 p-4 mt-6 rounded w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">🛍️ Current Auction</h2>

        {!activeProduct ? (
          <p className="text-gray-400">No product live right now.</p>
        ) : (
          <div className="bg-gray-700 p-3 rounded text-sm">
            <p>📦 <strong>{activeProduct.title}</strong></p>
            <p>💰 Starting at: ${activeProduct.price.toFixed(2)}</p>
            <p>🔥 Highest Bid: ${activeProduct.highestBid?.toFixed(2) || "—"}</p>
            <p>👤 Highest Bidder: {activeProduct.highestBidder || "—"}</p>
            <p>⏱ Time Left: {countdown}s</p>

            <div className="mt-3">
              <input
                type="number"
                placeholder="Your Bid"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full p-2 rounded bg-gray-600 text-white mb-2"
              />
              <button
                onClick={placeBid}
                className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              >
                💸 Place Bid
              </button>
            </div>
          </div>
        )}
      </div>

      {showCheckoutPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold">Auction Ended</h2>
            <p>
              You won <strong>{activeProduct?.title}</strong> for $
              {activeProduct?.highestBid || activeProduct?.price}
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Shipping Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="123 Coral Reef Lane"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Card Info</label>
              <input
                type="text"
                value={cardInfo}
                onChange={(e) => setCardInfo(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="**** **** **** 1234"
              />
            </div>

            <button
              onClick={handleConfirmPayment}
              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Confirm Payment
            </button>

            <button
              onClick={() => setShowCheckoutPrompt(false)}
              className="w-full py-2 text-sm text-gray-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        onClick={logout}
        className="mt-10 px-4 py-2 bg-red-500 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
