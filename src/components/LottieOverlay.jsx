import { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function LottieOverlay({ src, onFinish, duration = 2000, loop = true, dark = false }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={dark ? overlayEscuro : overlayTransparente}>
      <DotLottieReact
        src={src}
        autoplay
        loop={loop}
        style={{ width: 300, height: 300 }}
      />
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
  background: "rgba(0, 0, 0, 0.75)",
  pointerEvents: "all",
};