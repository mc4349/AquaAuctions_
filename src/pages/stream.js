// src/pages/stream.js

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import ChatBox from "@/components/ChatBox";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "659ca74bd1ef43f8bd76eee364741b32";
const CHANNEL = "aquaauctions";
const TOKEN = null; // replace with generated token if you have one

export default function StreamPage() {
  const { user, logout } = useAuth();
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [auctionTime, setAuctionTime] = useState("30");
  const [productQueue, setProductQueue] = useState([]);
  const clientRef = useRef(null);
  const localTracksRef = useRef({});

  const startAgoraStream = async () => {
    try {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      await client.setClientRole("host");
      await client.join(APP_ID, CHANNEL, TOKEN || null, user?.uid || null);

      const [videoTrack, audioTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localTracksRef.current = { videoTrack, audioTrack };

      videoTrack.play(videoRef.current);
      await client.publish([videoTrack, audioTrack]);

      setIsStreaming(true);
    } catch (error) {
      console.error("Agora stream error:", error);
    }
  };

  const addProductToQueue = async () => {
    if (!productTitle || !productPrice || isNaN(parseFloat(productPrice))) {
      alert("Enter valid product title and price.");
      return;
    }

    const newProduct = {
      title: productTitle,
      price: parseFloat(productPrice),
      addedAt: Date.now(),
      isActive: false,
    };

    const streamRef = doc(db, "Livestreams", "testStream");
    await setDoc(streamRef, { products: arrayUnion(newProduct) }, { merge: true });

    setProductQueue((prev) => [...prev, newProduct]);
    setProductTitle("");
    setProductPrice("");
  };

  const startAuction = async (product) => {
    const endsAt = Date.now() + parseInt(auctionTime) * 1000;

    const streamRef = doc(db, "Livestreams", "testStream");
    const streamSnap = await getDoc(streamRef);
    const products = streamSnap.data()?.products || [];

    const updatedProducts = products.map((p) => {
      if (p.addedAt === product.addedAt) {
        return {
          ...p,
          isActive: true,
          highestBid: null,
          highestBidder: null,
          endsAt,
        };
      }
      return { ...p, isActive: false };
    });

    await updateDoc(streamRef, { products: updatedProducts });
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white text-black px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">📡 Go Live with Agora</h1>

      <div
        ref={videoRef}
        id="agora-player"
        className="w-full max-w-md h-64 bg-black rounded-lg"
      ></div>

      {!isStreaming ? (
        <button
          onClick={startAgoraStream}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Go Live
        </button>
      ) : (
        <p className="mt-4 text-green-600 font-semibold">✅ You are live now!</p>
      )}

      {/* Auction Form */}
      <div className="w-full max-w-md bg-gray-100 mt-6 p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">➕ Add Product to Auction</h2>
        <input
          type="text"
          value={productTitle}
          onChange={(e) => setProductTitle(e.target.value)}
          placeholder="Title"
          className="w-full mb-2 p-2 rounded border"
        />
        <input
          type="number"
          value={productPrice}
          onChange={(e) => setProductPrice(e.target.value)}
          placeholder="Starting Price"
          className="w-full mb-2 p-2 rounded border"
        />
        <select
          value={auctionTime}
          onChange={(e) => setAuctionTime(e.target.value)}
          className="w-full mb-2 p-2 rounded border"
        >
          <option value="30">30s</option>
          <option value="60">1 min</option>
          <option value="120">2 min</option>
        </select>
        <button
          onClick={addProductToQueue}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add to Queue
        </button>
      </div>

      {/* Product Queue */}
      {productQueue.length > 0 && (
        <div className="w-full max-w-md bg-gray-200 mt-4 p-4 rounded shadow">
          <h3 className="font-semibold mb-2">📦 Products in Queue</h3>
          {productQueue.map((product) => (
            <div key={product.addedAt} className="border-b py-2">
              <p><strong>{product.title}</strong> – ${product.price.toFixed(2)}</p>
              <button
                onClick={() => startAuction(product)}
                className="mt-1 text-sm text-white bg-green-600 px-2 py-1 rounded hover:bg-green-700"
              >
                Start Auction
              </button>
            </div>
          ))}
        </div>
      )}

      <ChatBox />

      <button
        onClick={logout}
        className="mt-8 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
