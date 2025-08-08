import React, { useEffect, useRef } from 'react';
import { create, isPlayerSupported } from 'amazon-ivs-player';
import ChatBox from './ChatBox';

const LiveViewer = ({ streamId, playbackUrl }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!playbackUrl) return;
    if (!isPlayerSupported()) {
      console.warn('Amazon IVS Player is not supported in this browser.');
      return;
    }
    const player = create();
    player.attachHTMLVideoElement(videoRef.current);
    player.load(playbackUrl);
    player.play();
    return () => {
      player.pause();
      player.delete();
    };
  }, [playbackUrl]);

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
      <div className="w-full max-w-lg mt-8">
        <ChatBox streamId={streamId} />
      </div>
    </div>
  );
};

export default LiveViewer;
