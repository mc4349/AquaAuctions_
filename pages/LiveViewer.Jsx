import React, { useEffect, useRef } from 'react';
import { create, isPlayerSupported } from 'amazon-ivs-player';

const LiveViewer = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isPlayerSupported()) {
      console.warn('Amazon IVS Player is not supported in this browser.');
      return;
    }

    const player = create();
    player.attachHTMLVideoElement(videoRef.current);
    player.load('https://YOUR_PLAYBACK_URL.m3u8'); // Replace with your IVS playback URL
    player.play();

    return () => {
      player.pause();
      player.delete();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-xl font-semibold mb-4">📺 Livestream Viewer</h1>
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={{ width: '100%', maxWidth: '800px', borderRadius: '10px' }}
      />
    </div>
  );
};

export default LiveViewer;
