// src/pages/stream.js

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import ChatBox from "@/components/ChatBox";

const APP_ID = "659ca74bd1ef43f8bd76eee364741b32";
const CHANNEL = "aquaauctions";
const TOKEN = "007eJxTYJh6c6vZQ7nSJUu3s0b0v/fMFrkn4y2+6K7ffdsuln1ldQsUGMxMLZMTzU2SUgxT00yM0yySUszNUlNTjc1MzE0Mk4yNsn9OyGgIZGSwlWFiYWSAQBCfh8GxsDTRsTS5JDM/r5iBAQBeuSIP"; // temporary token

export default function StreamPage() {
  const { user, logout } = useAuth();
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [auctionTime, setAuctionTime] = useState("30");
  const [productQueue, setProductQueue] = useState([]);
  const clientRef = useRef(null);
  const localTrackRef = useRef(null);
  const micTrackRef = useRef(null);

  const startStream = async () => {
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    clientRef.current = client;

    await client.join(APP_ID, CHANNEL, TOKEN, user.uid);

    const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

    micTrackRef.current = microphoneTrack;
    localTrackRef.current = cameraTrack;

    cameraTrack.play(videoRef.current);
    await client.publish([microphoneTrack, cameraTrack]);

    setIsStreaming(true);

    await setDoc(doc(db, "Livestreams", "testStream"), {
      streamerId: user.uid,
      streamerName: user.displayName,
      isLive: true,
      startedAt: new Date(),
      productQueue: [],
    });
  };

  const stopStream = async () => {
    if (localTrackRef.current) {
      localTrackRef.current.stop();
      localTrackRef.current.close();
    }

    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current.close();
    }

    if (clientRef.current) {
      await clientRef.current.leave();
    }

    setIsStreaming(false);

    await updateDoc(doc(db, "Livestreams", "testStream"), {
      isLive: false,
      endedAt: new Date(),
    });
  };

  const addProductToQueue = async () => {
    const product = {
      title: productTitle,
      price: parseFloat(productPrice),
      duration: parseInt(auctionTime),
      addedAt: new Date(),
    };

    setProductQueue((prev) => [...prev, product]);

    await updateDoc(doc(db, "Livestreams", "testStream"), {
      productQueue: arrayUnion(product),
    });

    setProductTitle("");
    setProductPrice("");
    setAuctionTime("30");
  };

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🎥 Stream Live Auction</h1>

      <div className="mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", maxWidth: "800px", borderRadius: "12px" }}
        />
      </div>

      {!isStreaming ? (
        <button
          className="px-6 py-3 bg-green-600 rounded-md hover:bg-green-700"
          onClick={startStream}
        >
          Go Live
        </button>
      ) : (
        <button
          className="px-6 py-3 bg-red-600 rounded-md hover:bg-red-700"
          onClick={stopStream}
        >
          End Stream
        </button>
      )}

      {isStreaming && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Add Product to Auction Queue</h2>
          <input
            type="text"
            placeholder="Product Title"
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
          <input
            type="number"
            placeholder="Starting Price"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
          <select
            value={auctionTime}
            onChange={(e) => setAuctionTime(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="120">2 minutes</option>
          </select>
          <button
            onClick={addProductToQueue}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Add to Queue
          </button>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Chat</h2>
        <ChatBox streamId="testStream" />
      </div>
    </div>
  );
}
