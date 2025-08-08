import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import ChatBox from "@/components/ChatBox";

// Accept streamId as prop, default to "testStream"
export default function Dashboard({ streamId = "testStream" }) {
  const { user, logout } = useAuth();
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [client, setClient] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);

  // Product form
  const [newProduct, setNewProduct] = useState({
    title: "",
    price: "",
    duration: 60,
    seller: user?.email || "Unknown",
  });

  // Initialize Agora Client (as broadcaster)
  useEffect(() => {
    const initAgoraClient = async () => {
      if (typeof window === "undefined") return;
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await agoraClient.setClientRole("host");
      setClient(agoraClient);
    };
    initAgoraClient();
  }, []);

  // Listen for product updates on this streamId
  useEffect(() => {
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

  // Start/stop stream
  const startStream = async () => {
    if (!client) return;
    try {
      const APP_ID = "659ca74bd1ef43f8bd76eee364741b32";
      const CHANNEL = streamId;
      const TOKEN = null;
      await client.join(APP_ID, CHANNEL, TOKEN || null, null);
      const [cameraTrack, microphoneTrack] = await Promise.all([
        (await import("agora-rtc-sdk-ng")).default.createCameraVideoTrack(),
        (await import("agora-rtc-sdk-ng")).default.createMicrophoneAudioTrack(),
      ]);
      cameraTrack.play(videoRef.current);
      await client.publish([cameraTrack, microphoneTrack]);
      setIsStreaming(true);
      toast.success("🔴 You're now LIVE!");
    } catch (error) {
      console.error("Failed to start stream:", error);
      toast.error("Failed to start stream");
    }
  };

  const stopStream = async () => {
    if (!client || !isStreaming) return;
    try {
      await client.leave();
      setIsStreaming(false);
      if (videoRef.current) videoRef.current.innerHTML = "";
      toast.success("Stream stopped");
    } catch (error) {
      console.error("Failed to stop stream:", error);
    }
  };

  // Product queue management
  const addProduct = async () => {
    if (!newProduct.title || !newProduct.price) {
      alert("Please fill in all fields");
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
      if (streamDoc.exists()) {
        await updateDoc(streamRef, { products: updatedProducts });
      } else {
        await setDoc(streamRef, { products: updatedProducts });
      }
      setNewProduct({ title: "", price: "", duration: 60, seller: user?.email || "Unknown" });
      toast.success("Product added to queue!");
    } catch (error) {
      console.error("Failed to add product:", error);
      toast.error("Failed to add product");
    }
  };

  const startAuction = async (product) => {
    try {
      const streamRef = doc(db, "Livestreams", streamId);
      const updatedProducts = products.map((p) => ({
        ...p,
        isActive: p.addedAt === product.addedAt,
        endsAt: p.addedAt === product.addedAt ? Date.now() + product.duration * 1000 : null,
      }));
      await updateDoc(streamRef, { products: updatedProducts });
      toast.success(`Started auction for ${product.title}!`);
    } catch (error) {
      console.error("Failed to start auction:", error);
      toast.error("Failed to start auction");
    }
  };

  const stopAuction = async () => {
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
      console.error("Failed to stop auction:", error);
      toast.error("Failed to stop auction");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* STREAMING SECTION */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Live Stream</h2>
            <div
              ref={videoRef}
              className="w-full h-64 bg-black rounded-lg mb-4"
            ></div>
            <div className="flex gap-4">
              {!isStreaming ? (
                <button
                  onClick={startStream}
                  className="px-6 py-2 bg-red-600 rounded hover:bg-red-700"
                >
                  Go Live
                </button>
              ) : (
                <button
                  onClick={stopStream}
                  className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-700"
                >
                  Stop Stream
                </button>
              )}
            </div>
            {isStreaming && (
              <div className="mt-4 p-3 bg-red-900 rounded">
                <p className="text-red-200">LIVE - Viewers can now see you!</p>
              </div>
            )}
          </div>
          {/* PRODUCT MANAGEMENT */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Add Product</h2>
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
        {/* PRODUCT QUEUE */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Product Queue</h2>
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
        {/* LIVE CHAT */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Live Chat</h2>
          <ChatBox streamId={streamId} />
        </div>
      </div>
    </div>
  );
}