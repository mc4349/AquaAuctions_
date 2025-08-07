// pages/live.js

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
import ChatBox from "@/components/ChatBox";
import { toast, Toaster } from "react-hot-toast";

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
  const [isWinner, setIsWinner] = useState(false);

  useEffect(() => {
    const initAgoraPlayer = async () => {
      if (typeof window === "undefined") return;
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
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

      client.on("user-unpublished", () => {
        if (videoRef.current) videoRef.current.innerHTML = "";
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
        const winnerEmail = active.highestBidder;
        setIsWinner(user?.email && winnerEmail && user.email === winnerEmail);
        setShowCheckoutPrompt(user?.email && winnerEmail && user.email === winnerEmail);
      } else {
        setShowCheckoutPrompt(false);
      }
    });

    return () => unsubscribe();
  }, [user?.email]);

  useEffect(() => {
    if (!activeProduct?.endsAt) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((activeProduct.endsAt - Date.now()) / 1000));
      setCountdown(secondsLeft);
      if (secondsLeft === 0 && !showCheckoutPrompt) {
        setIsWinner(user?.email === activeProduct?.highestBidder);
        setShowCheckoutPrompt(user?.email === activeProduct?.highestBidder);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeProduct, showCheckoutPrompt, user?.email]);

  useEffect(() => {
    if (activeProduct?.highestBidder && activeProduct?.highestBidder !== (user?.email || "Anonymous")) {
      toast.error("⚠️ You've been outbid!");
    }
  }, [activeProduct?.highestBidder, user?.email]);

  const placeBid = async () => {
    const bid = parseFloat(bidAmount);
    if (!activeProduct || isNaN(bid)) {
      alert("Enter a valid bid amount.");
      return;
    }
    const currentBid = activeProduct.highestBid || activeProduct.price;
    if (bid <= currentBid) {
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
      toast.success("✅ You are now the highest bidder!");
    } catch (err) {
      console.error("❌ Failed to place bid:", err.message);
      alert("Bid failed. Try again.");
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
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-lg p-4 shadow">
            <div
              ref={videoRef}
              className="w-full h-64 md:h-[400px] bg-black rounded-lg mb-4"
            ></div>

            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">🔴 Live Auction</h2>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>

            {activeProduct ? (
              <div className="space-y-2">
                <h3 className="text-lg font-bold">{activeProduct.title}</h3>
                <p>💰 Starting at: ${Number(activeProduct.price).toFixed(2)}</p>
                <p>🔥 Highest Bid: ${activeProduct.highestBid ? Number(activeProduct.highestBid).toFixed(2) : "—"}</p>
                <p>👤 Highest Bidder: {activeProduct.highestBidder || "—"}</p>
                <p>⏱ Time Left: {countdown}s</p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    placeholder="Your Bid"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="p-2 rounded bg-gray-700 w-full"
                    disabled={countdown === 0}
                  />
                  <button
                    onClick={placeBid}
                    className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                    disabled={countdown === 0}
                  >
                    💸 Place Bid
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No product live right now.</p>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 shadow h-fit">
          <h2 className="text-xl font-semibold mb-3">💬 Live Chat</h2>
          <ChatBox streamId="testStream" />
        </div>
      </div>

      {showCheckoutPrompt && isWinner && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold">Auction Ended</h2>
            <p>
              You won <strong>{activeProduct?.title}</strong> for $
              {activeProduct?.highestBid || activeProduct?.price}
            </p>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Shipping Address"
            />
            <input
              type="text"
              value={cardInfo}
              onChange={(e) => setCardInfo(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Card Info"
            />

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
    </div>
  );
}
