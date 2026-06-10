import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const SRC = "https://lottie.host/ed760d20-d514-4f1a-be24-750be823d0a8/npSupVCY4g.lottie";

export default function CoinLottie({ size = 24, animated = false }) {
  return (
    <DotLottieReact
      src={SRC}
      autoplay={animated}
      loop={animated}
      style={{ width: size, height: size, display: "inline-block", flexShrink: 0 }}
    />
  );
}