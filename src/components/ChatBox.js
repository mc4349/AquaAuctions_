// src/components/ChatBox.js

import { useEffect, useRef, useState } from "react";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";
import { auth } from "@/firebase/firebaseClient";

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const db = getDatabase();
    const chatRef = ref(db, "chat");

    const unsubscribe = onChildAdded(chatRef, (snapshot) => {
      setMessages((prev) => [...prev, snapshot.val()]);
    });

    return () => unsubscribe(); // Clean up listener
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const db = getDatabase();
    const chatRef = ref(db, "chat");

    await push(chatRef, {
      name: auth.currentUser.displayName,
      message: input,
      timestamp: Date.now(),
    });

    setInput("");
  };

  return (
    <div className="w-full max-w-md mt-6">
      <div className="bg-gray-100 h-64 overflow-y-auto rounded p-3 mb-2">
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
