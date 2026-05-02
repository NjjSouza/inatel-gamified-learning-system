export default function TwemojiImg({ codepoint, size = 20, alt = "" }) {
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`}
      alt={alt}
      style={{ width: size, height: size, verticalAlign: "middle" }}
    />
  );
}