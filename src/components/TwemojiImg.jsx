// Mapeamento de codepoint para emoji unicode nativo
// Usado como fallback quando o CDN do Twemoji é bloqueado (Edge, Safari com proteção de rastreamento)
const CODEPOINT_TO_EMOJI = {
  "1faa8": "🪨",
  "1f949": "🥉",
  "1f948": "🥈",
  "1f947": "🥇",
  "1f52e": "🔮",
  "1f48e": "💎",
  "26a1":  "⚡",
  "23f1":  "⏱",
  "1f3c6": "🏆",
};

export default function TwemojiImg({ codepoint, size = 20, alt = "" }) {
  const emoji = CODEPOINT_TO_EMOJI[codepoint];

  // Fallback: emoji nativo via <span> - funciona em qualquer ambiente
  // sem depender de CDN externo que pode ser bloqueado por tracking prevention
  if (emoji) {
    return (
      <span
        role="img"
        aria-label={alt}
        style={{
          fontSize: size * 0.85,
          lineHeight: 1,
          display: "inline-block",
          verticalAlign: "middle",
          userSelect: "none",
        }}
      >
        {emoji}
      </span>
    );
  }

  // Fallback para codepoints não mapeados: tenta o CDN do unpkg
  return (
    <img
      src={`https://unpkg.com/twemoji@14.0.2/assets/72x72/${codepoint}.png`}
      alt={alt}
      style={{ width: size, height: size, verticalAlign: "middle" }}
      onError={(e) => {
        // Se o CDN falhar, esconde a imagem silenciosamente
        e.target.style.display = "none";
      }}
    />
  );
}