// src/pages/dashboard.js

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const fetchSellerOrders = async () => {
      try {
        const q = query(
          collection(db, "Orders"),
          where("product.seller", "==", user.email),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setOrders(results);
      } catch (err) {
        console.error("Failed to fetch seller orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerOrders();
  }, [user]);

  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.product.highestBid || order.product.price || 0),
    0
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please log in to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Seller Dashboard</h1>

      {loading ? (
        <p className="text-gray-400">Loading your data...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400">No sales yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded shadow text-center">
              <p className="text-sm text-gray-400">Items Sold</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded shadow text-center">
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded shadow text-center">
              <p className="text-sm text-gray-400">Seller Email</p>
              <p className="text-xs mt-1 truncate">{user.email}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-3">🧾 Recent Orders</h2>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="bg-gray-900 p-4 rounded shadow text-sm"
              >
                <p className="font-semibold">{order.product.title}</p>
                <p>
                  💰 Sold for: ${order.product.highestBid || order.product.price}
                </p>
                <p>📍 Buyer: {order.buyer}</p>
                <p>
                  🕒 Date:{" "}
                  {new Date(order.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
