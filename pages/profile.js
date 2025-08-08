import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateProfile } from "firebase/auth";

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPreview(user.photoURL || null);
    }
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      if (!user) return;
      await updateProfile(user, {
        displayName,
        photoURL: preview,
      });
      setMessage("âœ… Profile updated.");
    } catch (err) {
      console.error("Update failed:", err);
      setMessage("âŒ Failed to update profile.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>You must be logged in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">ðŸ‘¤ Your Profile</h1>

      {preview && (
        <img
          src={preview}
          alt="Profile"
          className="w-24 h-24 rounded-full mb-4 object-cover"
        />
      )}

      <div className="mb-4">
        <label className="block text-sm mb-1">Profile Picture</label>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Email</label>
        <p className="bg-gray-700 px-3 py-2 rounded">{user.email}</p>
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Save Changes
      </button>

      {message && <p className="mt-4 text-sm text-green-400">{message}</p>}
    </div>
  );
}
