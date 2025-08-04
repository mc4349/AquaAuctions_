import { useState } from "react";

export default function AddProductForm({ onAddProduct }) {
  const [name, setName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [duration, setDuration] = useState("30");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !startingPrice) return;

    onAddProduct({
      name,
      startingPrice: parseFloat(startingPrice),
      duration: parseInt(duration),
      timestamp: Date.now()
    });

    setName("");
    setStartingPrice("");
    setDuration("30");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded text-black w-full max-w-md">
      <h2 className="text-lg font-bold">Add Product to Auction</h2>
      <input
        type="text"
        placeholder="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="number"
        placeholder="Starting Price ($)"
        value={startingPrice}
        onChange={(e) => setStartingPrice(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <select
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="30">30 seconds</option>
        <option value="60">1 minute</option>
        <option value="120">2 minutes</option>
      </select>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Add to Stream
      </button>
    </form>
  );
}
