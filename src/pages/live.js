// src/pages/live.js
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, addDoc, collection } from "firebase/firestore";

const PLAYBACK_URL =
  "https://aedbe23c3ab7.us-east-1.playback.live-video.net/api/video/v1/us-east-1.991046441176.channel.vwzbgNVljgch.m3u8";

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
    const setupPlayer = async () => {
      if (!window.IVSPlayer) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src =
            "https://player.live-video.net/1.20.0/amazon-ivs-player.min.js";
          script.async = true;
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      const waitUntilReady = () =>
        new Promise((resolve) => {
          const interval = setInterval(() => {
            if (
              window.IVSPlayer &&
              typeof window.IVSPlayer.isPlayerSupported === "function"
            ) {
              clearInterval(interval);
              resolve(window.IVSPlayer);
            }
          }, 50);
        });

      const IVSPlayer = await waitUntilReady();
      if (!IVSPlayer.isPlayerSupported()) return;

      const player = IVSPlayer.create();
      player.attachHTMLVideoElement(videoRef.current);
      player.load(PLAYBACK_URL);
      player.setAutoplay(true);
      player.setVolume(1.0);
      player.play();
    };

    setupPlayer();
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
      const updatedProducts = (prev) =>
        prev.map((p) =>
          p.addedAt === activeProduct.addedAt
            ? { ...p, highestBid: bid, highestBidder: user?.email || "Anonymous" }
            : p
        );

      await updateDoc(streamRef, {
        products: updatedProducts,
      });

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

      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={{ width: "100%", maxWidth: "800px", borderRadius: "10px" }}
      />

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
            <p>You won <strong>{activeProduct?.title}</strong> for ${activeProduct?.highestBid || activeProduct?.price}</p>

            <div>
              <label className="block text-sm font-medium mb-1">Shipping Address</label>
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
