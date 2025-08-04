// src/pages/stream.js

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ChatBox from "@/components/ChatBox"; // ✅ Add this

const INGEST_URL = "rtmps://aedbe23c3ab7.global-contribute.live-video.net:443/app/";
const STREAM_KEY = "sk_us-east-1_ck3aG5T2xaHQ_mqqDhx1ucn1a2ifZ2fFolEshQYmOjt";

export default function StreamPage() {
  const { user, logout } = useAuth();
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    async function startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

    startCamera();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startStream = async () => {
    if (!window.IVSBroadcastClient) {
      const script = document.createElement("script");
      script.src = "https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js";
      script.onload = () => initBroadcaster();
      document.body.appendChild(script);
    } else {
      initBroadcaster();
    }
  };

  const initBroadcaster = () => {
    const { IVSBroadcastClient } = window;
    const client = IVSBroadcastClient.create({
      streamConfig: IVSBroadcastClient.BASIC_LANDSCAPE,
      ingestEndpoint: INGEST_URL,
    });

    const stream = mediaStreamRef.current;
    client.addVideoInputDevice(stream);
    client.addAudioInputDevice(stream);

    client.startBroadcast(STREAM_KEY);
    setIsStreaming(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black px-4">
      <h1 className="text-2xl font-bold mb-4">📡 Stream Live Auction</h1>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full max-w-md rounded-lg shadow"
      />

      {!isStreaming ? (
        <button
          onClick={startStream}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Go Live
        </button>
      ) : (
        <p className="mt-4 text-green-600 font-semibold">You are live now!</p>
      )}

      <ChatBox /> {/* ✅ Chat component */}

      <button
        onClick={logout}
        className="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
