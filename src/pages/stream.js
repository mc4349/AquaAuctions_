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

const INGEST_URL = "rtmps://aedbe23c3ab7.global-contribute.live-video.net:443/app/";
const STREAM_KEY = "sk_us-east-1_ck3aG5T2xaHQ_mqqDhx1ucn1a2ifZ2fFolEshQYmOjt";

export default function StreamPage() {
  const { user, logout } = useAuth();
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [auctionTime, setAuctionTime] = useState("30");
  const [productQueue, setProductQueue] = useState([]);

  useEffect(() => {
    async function startCameraAndInit() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const loadScriptAndStart = () => {
          if (!window.IVSBroadcastClient) {
            const script = document.createElement("script");
            script.src = "https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js";
            script.onload = () => initBroadcaster(stream);
            document.body.appendChild(script);
          } else {
            initBroadcaster(stream);
          }
        };

        loadScriptAndStart();
      } catch (err) {
        console.error("Failed to access camera/mic:", err);
      }
    }

    startCameraAndInit();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initBroadcaster = (stream) => {
    const { IVSBroadcastClient } = window;
    const client = IVSBroadcastClient.create({
      streamConfig: IVSBroadcastClient.BASIC_LANDSCAPE,
      ingestEndpoint: INGEST_URL,
    });

    if (!stream) {
      console.error("No media stream found");
      return;
    }

    console.log("Adding devices to broadcast client...");
    client.addVideoInputDevice(stream, "iPad Camera");
    client.addAudioInputDevice(stream, "iPad Mic");

    console.log("Starting broadcast...");
    client.startBroadcast(STREAM_KEY);
    setIsStreaming(true);
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
      <h1 className="text-2xl font-bold mb-4">📡 Go Live and Manage Auctions</h1>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full max-w-md rounded-lg shadow"
      />

      {!isStreaming ? (
        <p className="mt-4 text-yellow-500">🔄 Connecting to livestream...</p>
      ) : (
        <p className="mt-4 text-green-600 font-semibold">✅ You are live now!</p>
      )}

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
