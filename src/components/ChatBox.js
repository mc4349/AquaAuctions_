// src/components/ChatBox.js

import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";

export default function ChatBox({ streamId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "Livestreams", streamId, "messages"),
      orderBy("timestamp")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((doc) => doc.data());
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [streamId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, "Livestreams", streamId, "messages"), {
      name: user?.displayName || "Anonymous",
      message: input,
      timestamp: Date.now(),
    });

    setInput("");
  };

  return (
    <div className="w-full max-w-md mt-6">
      <div className="bg-gray-100 h-64 overflow-y-auto rounded p-3 mb-2 text-black">
        {messages.map((msg, idx) => (
          <p key={idx}><strong>{msg.name}:</strong> {msg.message}</p>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border px-3 py-2 rounded-l"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
