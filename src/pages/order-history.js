// src/pages/order-history.js
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";

export default function OrderHistory() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.email) return;

      try {
        const q = query(
          collection(db, "Orders"),
          where("buyer", "==", user.email)
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(results.sort((a, b) => b.createdAt - a.createdAt));
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📦 Your Order History</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400">No past orders found.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-800 p-4 rounded shadow-md space-y-2"
            >
              <p className="text-sm text-gray-400">
                Ordered on {format(order.createdAt, "PPPpp")}
              </p>
              <p className="text-lg font-semibold">🛍️ {order.product?.title}</p>
              <p>💰 Price: ${order.product?.highestBid || order.product?.price}</p>
              {order.product?.image && (
                <img
                  src={order.product.image}
                  alt={order.product.title}
                  className="w-full max-w-xs rounded border mt-2"
                />
              )}
              <p>📍 Ship To: {order.shippingAddress}</p>
              <p>💳 Payment: {order.cardUsed}</p>
              <p>
                🚚 Tracking Number:{" "}
                {order.trackingNumber || (
                  <span className="text-yellow-400">Not yet provided</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
