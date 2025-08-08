import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";

// Add fields for creating a new stream
const CATEGORY_OPTIONS = ["Art", "Electronics", "Fashion", "Toys", "Other"];
const DEFAULT_CATEGORY = CATEGORY_OPTIONS[0];

export default function Stream() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const videoRef = useRef(null);

  // These are for the new stream
  const [streamId, setStreamId] = useState(""); // Unique per streamer/session
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [isLive, setIsLive] = useState(false);

  // Agora client state
  const [client, setClient] = useState(null);
  const [cameraTrack, setCameraTrack] = useState(null);
  const [micTrack, setMicTrack] = useState(null);

  // Auction/product state
  const [products, setProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    title: "",
    price: "",
    duration: 60,
    seller: user?.email || "Unknown",
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // Initialize Agora Client and media tracks
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const c = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await c.setClientRole("host");
      const cam = await AgoraRTC.createCameraVideoTrack();
      const mic = await AgoraRTC.createMicrophoneAudioTrack();
      cam.play(videoRef.current);
      setClient(c);
      setCameraTrack(cam);
      setMicTrack(mic);
    };
    init();
  }, []);

  // Listen to Livestream Products
  useEffect(() => {
    if (!streamId) return;
    const streamRef = doc(db, "Livestreams", streamId);
    const unsubscribe = onSnapshot(streamRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.products) {
        setProducts(data.products);
        setActiveProduct(data.products.find((p) => p.isActive) || null);
      }
    });
    return () => unsubscribe();
  }, [streamId]);

  // Start live stream and register in Firestore
  const startStream = async () => {
    if (!streamId || !title) {
      toast.error("Stream ID and Title are required!");
      return;
    }
    if (!client || !cameraTrack || !micTrack) {
      toast.error("Stream not ready yet!");
      return;
    }
    try {
      await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID || "659ca74bd1ef43f8bd76eee364741b32", streamId, null, null);
      await client.publish([cameraTrack, micTrack]);
      setIsLive(true);

      // Register the stream in Firestore
      const streamRef = doc(db, "Livestreams", streamId);
      await setDoc(streamRef, {
        isLive: true,
        startedAt: Date.now(),
        title,
        category,
        seller: user?.email || "Unknown",
        viewerCount: 0,
        totalSales: 0,
        products: [],
        // playbackUrl: ... // You may add this if using IVS or other player
      }, { merge: true });

      toast.success("🔴 You're now LIVE!");
    } catch (error) {
      console.error("Failed to start stream:", error);
      toast.error("Failed to start stream");
    }
  };

  const stopStream = async () => {
    try {
      await client.leave();
      if (videoRef.current) videoRef.current.innerHTML = "";
      setIsLive(false);
      // Mark stream as not live in Firestore
      if (streamId) {
        await updateDoc(doc(db, "Livestreams", streamId), { isLive: false });
      }
      toast.success("Stream stopped");
    } catch (error) {
      console.error("Failed to stop stream:", error);
      toast.error("Error stopping stream");
    }
  };

  // Add product to current stream
  const addProduct = async () => {
    if (!streamId) {
      toast.error("Create/Start a stream first!");
      return;
    }
    if (!newProduct.title || !newProduct.price) {
      toast.error("Fill in all product fields");
      return;
    }
    const product = {
      title: newProduct.title,
      price: parseFloat(newProduct.price),
      duration: parseInt(newProduct.duration),
      addedAt: Date.now(),
      isActive: false,
      highestBid: null,
      highestBidder: null,
      seller: user?.email || "Unknown",
    };
    try {
      const streamRef = doc(db, "Livestreams", streamId);
      const streamDoc = await getDoc(streamRef);
      const currentProducts = streamDoc.exists() ? streamDoc.data().products || [] : [];
      const updatedProducts = [...currentProducts, product];
      await updateDoc(streamRef, { products: updatedProducts });
      setNewProduct({ title: "", price: "", duration: 60, seller: user?.email || "Unknown" });
      toast.success("Product added!");
    } catch (error) {
      console.error("Failed to add product:", error);
      toast.error("Failed to add product");
    }
  };

  // Auction controls
  const startAuction = async (product) => {
    if (!streamId) return;
    try {
      const streamRef = doc(db, "Livestreams", streamId);
      const updatedProducts = products.map((p) => ({
        ...p,
        isActive: p.addedAt === product.addedAt,
        endsAt: p.addedAt === product.addedAt ? Date.now() + product.duration * 1000 : null,
      }));
      await updateDoc(streamRef, { products: updatedProducts });
      toast.success(`Auction started for ${product.title}`);
    } catch (error) {
      console.error("Error starting auction:", error);
      toast.error("Could not start auction");
    }
  };

  const stopAuction = async () => {
    if (!streamId) return;
    try {
      const streamRef = doc(db, "Livestreams", streamId);
      const updatedProducts = products.map((p) => ({
        ...p,
        isActive: false,
        endsAt: null,
      }));
      await updateDoc(streamRef, { products: updatedProducts });
      toast.success("Auction stopped");
    } catch (error) {
      console.error("Error stopping auction:", error);
      toast.error("Could not stop auction");
    }
  };

  // Render UI
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">🎥 Stream Setup & Dashboard</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
        {/* Stream Setup */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">📝 Stream Details</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Unique Stream ID (e.g. yourname-123)"
              value={streamId}
              onChange={e => setStreamId(e.target.value.replace(/\s/g, ""))}
              className="flex-1 p-3 rounded bg-gray-700 text-white"
              disabled={isLive}
            />
            <input
              type="text"
              placeholder="Stream Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="flex-1 p-3 rounded bg-gray-700 text-white"
              disabled={isLive}
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="flex-1 p-3 rounded bg-gray-700 text-white"
              disabled={isLive}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option value={opt} key={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-4">
            {!isLive ? (
              <button
                onClick={startStream}
                className="px-6 py-2 bg-red-600 rounded hover:bg-red-700"
              >
                🔴 Go Live
              </button>
            ) : (
              <button
                onClick={stopStream}
                className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                ⏹️ Stop Stream
              </button>
            )}
          </div>
          <div
            ref={videoRef}
            className="w-full h-64 bg-black rounded-lg mt-4 overflow-hidden"
          />
          {isLive && (
            <div className="mt-4 p-3 bg-red-900 rounded">
              <p className="text-red-200">🔴 LIVE - Viewers can now see you!</p>
              <p className="text-gray-300">Share your stream link: <span className="font-mono">{`/live/${streamId}`}</span></p>
            </div>
          )}
        </div>
        {/* Product Form */}
        {isLive && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">🛍️ Add Product</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product Title"
                value={newProduct.title}
                onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full p-3 rounded bg-gray-700 text-white"
              />
              <input
                type="number"
                placeholder="Starting Price"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="w-full p-3 rounded bg-gray-700 text-white"
              />
              <input
                type="number"
                placeholder="Auction Duration (seconds)"
                value={newProduct.duration}
                onChange={(e) => setNewProduct({ ...newProduct, duration: e.target.value })}
                className="w-full p-3 rounded bg-gray-700 text-white"
              />
              <button
                onClick={addProduct}
                className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Add to Queue
              </button>
            </div>
          </div>
        )}
        {/* Product Queue */}
        {isLive && (
          <div className="mt-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📦 Product Queue</h2>
            {products.length === 0 ? (
              <p className="text-gray-400">No products in queue</p>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.addedAt}
                    className={`p-4 rounded ${
                      product.isActive ? "bg-green-900" : "bg-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{product.title}</h3>
                        <p className="text-gray-300">
                          Starting: ${product.price} | Duration: {product.duration}s
                        </p>
                        {product.highestBid && (
                          <p className="text-green-400">
                            Current Bid: ${product.highestBid} by {product.highestBidder}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {product.isActive ? (
                          <button
                            onClick={stopAuction}
                            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                          >
                            Stop Auction
                          </button>
                        ) : (
                          <button
                            onClick={() => startAuction(product)}
                            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                          >
                            Start Auction
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
