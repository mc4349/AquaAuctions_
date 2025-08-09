import React, { useEffect, useRef } from 'react';
import ChatBox from './ChatBox';

// Agora App ID for your project
const APP_ID = '659ca74bd1ef43f8bd76eee364741b32';

const LiveViewer = ({ streamId }) => {
  const videoRef = useRef(null);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!streamId) return;
    if (typeof window === 'undefined') return; // Prevent running on server

    // Dynamically import AgoraRTC so it only loads in the browser
    import('agora-rtc-sdk-ng').then(({ default: AgoraRTC }) => {
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      client.setClientRole('audience');

      client
        .join(APP_ID, streamId, null, null)
        .then(() => {
          client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') {
              user.videoTrack.play(videoRef.current);
            }
            if (mediaType === 'audio') {
              user.audioTrack.play();
            }
          });
        })
        .catch((err) => {
          console.error('Agora join error:', err);
        });
    });

    return () => {
      clientRef.current?.leave().catch(() => {});
    };
  }, [streamId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-xl font-semibold mb-4">📺 Livestream Viewer</h1>
      <div
        ref={videoRef}
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '10px',
          background: '#222',
          minHeight: '450px'
        }}
      />
      <div className="w-full max-w-lg mt-8">
        <ChatBox streamId={streamId} />
      </div>
    </div>
  );
};

export default LiveViewer;