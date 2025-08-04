// src/pages/livehost.js

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc
} from "firebase/firestore";

const PLAYBACK_URL =
  "https://aedbe23c3ab7.us-east-1.playback.live-video.net/api/video/v1/us-east-1.991046441176.channel.vwzbgNVljgch.m3u8";

export default function LiveHost() {
  const { logout } = useAuth();
  const videoRef = useRef(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

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

      if (!IVSPlayer.isPlayerSupported()) {
        console.warn("IVS Player not supported");
        return;
      }

      const player = IVSPlayer.create();
      player.attachHTMLVideoElement(videoRef.current);
      player.load(PLAYBACK_URL);
      player.setAutoplay(true);
      player.setVolume(1.0);
      player.play();
    };

    setupPlayer();
  }, []);

  const addProductToStream = async () => {
    if (!title || !price || !duration) {
      alert("Please fill all fields");
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(duration);

    if (isNaN(parsedPrice) || isNaN(parsedDuration)) {
      alert("Invalid price or duration.");
      return;
    }

    const streamRef = doc(db, "Livestreams", "testStream");
    const snapshot = await getDoc(streamRef);

    const data = snapshot.exists() ? snapshot.data() : { products: [] };

    // Deactivate existing active product
    const updatedProducts = (data.products || []).map((p) => ({
      ...p,
      isActive: false
    }));

    // Add new product as active
    const now = Date.now();
    const newProduct = {
      title: title.trim(),
      price: parsedPrice,
      duration: parsedDuration,
      addedAt: now,
      isActive: true,
      highestBid: parsedPrice,
      highestBidder: "",
      endsAt: now + parsedDuration * 1000
    };

    updatedProducts.push(newProduct);

    try {
      await setDoc(streamRef, { products: updatedProducts }, { merge: true });
      alert("✅ Product added as active auction item!");
      setTitle("");
      setPrice("");
      setDuration("");
    } catch (err) {
      console.error("❌ Failed to update Firestore:", err.message);
      alert("Failed to add product. Check console.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <h1 className="text-2xl font-bold mb-4">🎥 Host Livestream</h1>

      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={{ width: "100%", maxWidth: "800px", borderRadius: "10px" }}
      />

      <div className="bg-gray-800 p-4 mt-6 rounded w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">🛍️ Add Product to Auction</h2>

        <label htmlFor="product-title" className="block mb-1">
          Product Title
        </label>
        <input
          id="product-title"
          name="product-title"
          type="text"
          placeholder="Product Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 mb-2 rounded bg-gray-700 text-white"
        />

        <label htmlFor="product-price" className="block mb-1">
          Starting Price ($)
        </label>
        <input
          id="product-price"
          name="product-price"
          type="number"
          placeholder="Starting Price ($)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-2 mb-2 rounded bg-gray-700 text-white"
        />

        <label htmlFor="product-duration" className="block mb-1">
          Duration (sec)
        </label>
        <input
          id="product-duration"
          name="product-duration"
          type="number"
          placeholder="Duration (sec)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
        />

        <button
          onClick={addProductToStream}
          className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          ➕ Add Product
        </button>
      </div>

      <button
        onClick={logout}
        className="mt-10 px-4 py-2 bg-red-500 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
