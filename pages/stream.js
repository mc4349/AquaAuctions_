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

const APP_ID = "659ca74bd1ef43f8bd76eee364741b32";
const CHANNEL = "aquaauctions";
const TOKEN = null;

export default function StreamerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [client, setClient] = useState(null);
  const [cameraTrack, setCameraTrack] = useState(null);
  const [micTrack, setMicTrack] = useState(null);
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
  }, [user]);

  // Initialize Agora Client and get permissions
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
    const streamRef = doc(db, "Livestreams", "testStream");
    const unsubscribe = onSnapshot(streamRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.products) {
        setProducts(data.products);
        setActiveProduct(data.products.find((p) => p.isActive) || null);
      }
    });

    return () => unsubscribe();
  }, []);

  const startStream = async () => {
    if (!client || !cameraTrack || !micTrack) {
      toast.error("Stream not ready yet!");
      return;
    }

    try {
      await client.join(APP_ID, CHANNEL, TOKEN || null, null);
      await client.publish([cameraTrack, micTrack]);
      setIsStreaming(true);
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
      setIsStreaming(false);
      toast.success("Stream stopped");
    } catch (error) {
      console.error("Failed to stop stream:", error);
      toast.error("Error stopping stream");
    }
  };

  const addProduct = async () => {
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
      const streamRef = doc(db, "Livestreams", "testStream");
      const streamDoc = await getDoc(streamRef);
      const currentProducts = streamDoc.exists() ? streamDoc.data().products || [] : [];
      const updatedProducts = [...currentProducts, product];

      if (streamDoc.exists()) {
        await updateDoc(streamRef, { products: updatedProducts });
      } else {
        await setDoc(streamRef, { products: updatedProducts });
      }

      setNewProduct({ title: "", price: "", duration: 60, seller: user?.email || "Unknown" });
      toast.success("Product added!");
    } catch (error) {
      console.error("Failed to add product:", error);
      toast.error("Failed to add product");
    }
  };

  const startAuction = async (product) => {
    try {
      const streamRef = doc(db, "Livestreams", "testStream");
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
    try {
      const streamRef = doc(db, "Livestreams", "testStream");
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">🎥 Streamer Dashboard</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stream Preview */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📹 Live Stream</h2>
            <div
              ref={videoRef}
              className="w-full h-64 bg-black rounded-lg mb-4 overflow-hidden"
            />
            <div className="flex gap-4">
              {!isStreaming ? (
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
            {isStreaming && (
              <div className="mt-4 p-3 bg-red-900 rounded">
                <p className="text-red-200">🔴 LIVE - Viewers can now see you!</p>
              </div>
            )}
          </div>

          {/* Product Form */}
          <div className="bg-gray-800 p-6 rounded-lg">
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
        </div>

        {/* Product Queue */}
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
      </div>
    </div>
  );
}
