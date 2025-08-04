// src/pages/order-history.js

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
import { useRouter } from "next/router";
import Link from "next/link";

export default function OrderHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "Orders"),
          where("buyer", "==", user.email),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(results);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg">You must be logged in to view order history.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">🧾 Your Order History</h1>

      {loading ? (
        <p className="text-gray-400">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-400">No orders found.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="bg-gray-800 p-4 rounded-lg shadow text-sm"
            >
              <div className="mb-1">
                <span className="font-semibold">📦 {order.product.title}</span>
              </div>
              <p>💰 Total: ${order.product.highestBid || order.product.price}</p>
              <p>📍 Shipped to: {order.shippingAddress}</p>
              <p>
                🕒 Ordered on:{" "}
                {new Date(order.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p>💳 Card used: {order.cardUsed}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => router.push("/account")}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          ← Back to Account
        </button>

        <Link href="/order-history" className="text-sm text-blue-400 underline">
          View My Orders
        </Link>
      </div>
    </div>
  );
}
