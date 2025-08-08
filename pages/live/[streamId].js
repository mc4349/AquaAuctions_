import { useRouter } from "next/router";
import LiveViewer from "@/components/LiveViewer";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LiveStreamPage() {
  const router = useRouter();
  const { streamId } = router.query;
  const [playbackUrl, setPlaybackUrl] = useState("");

  useEffect(() => {
    if (!streamId) return;
    const fetchStream = async () => {
      const docRef = doc(db, "Livestreams", streamId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPlaybackUrl(docSnap.data().playbackUrl || "");
      }
    };
    fetchStream();
  }, [streamId]);

  if (!streamId) return null;
  return (
    <LiveViewer streamId={streamId} playbackUrl={playbackUrl} />
  );
}