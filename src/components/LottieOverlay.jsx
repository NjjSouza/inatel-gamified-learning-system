import { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function LottieOverlay({ src, isVideo, onFinish, duration = 2000 }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={isVideo ? overlayEscuro : overlayTransparente}>
      {isVideo ? (
        <video autoPlay muted playsInline style={{ width: 300, height: 300 }}>
          <source src={src} type="video/webm" />
        </video>
      ) : (
        <DotLottieReact
          src={src}
          autoplay
          loop
          style={{ width: 300, height: 300 }}
        />
      )}
    </div>
  );
}

const base = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const overlayTransparente = {
  ...base,
  background: "transparent",
  pointerEvents: "none",
};

const overlayEscuro = {
  ...base,
  background: "rgba(0, 0, 0, 0.7)",
  pointerEvents: "all",
};