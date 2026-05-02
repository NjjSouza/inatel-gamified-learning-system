import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import TwemojiImg from "./TwemojiImg";

const NIVEL_CODEPOINTS = {
  "Pedra":    "1faa8",
  "Bronze":   "1f949",
  "Prata":    "1f948",
  "Ouro":     "1f947",
  "Platina":  "1f52e",
  "Diamante": "1f48e",
};

export default function RankingTable({ players, highlightUserId, showNivel = false }) {
  if (!players || players.length === 0) return null;

  const medalhas = ["1f947", "1f948", "1f949"];

  return (
    <div>
      <DotLottieReact
        src="https://lottie.host/d27aa6bc-5e72-47d9-b39d-2f95d7ad58b1/pNEe3jnJDU.lottie"
        autoplay
        loop
        style={{ width: 120, height: 120, margin: "0 auto" }}
      />

      <table style={tabela}>
        <thead>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Aluno</th>
            {showNivel && <th style={thStyle}>Nível</th>}
            <th style={thStyle}>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {[...players]
            .sort((a, b) => (b.score ?? b.xp ?? 0) - (a.score ?? a.xp ?? 0))
            .map((p, i) => (
              <tr key={p.id} style={{
                ...trStyle,
                background: p.id === highlightUserId
                  ? "var(--destaque-usuario)"
                  : i === 0 ? "var(--destaque-primeiro)" : "transparent",
                fontWeight: p.id === highlightUserId ? "bold" : "normal",
              }}>
                <td style={tdStyle}>
                  {i < 3
                    ? <TwemojiImg codepoint={medalhas[i]} size={22} alt={`${i+1}º lugar`} />
                    : i + 1
                  }
                </td>
                <td style={{ ...tdStyle, textAlign: "left" }}>{p.nome}</td>
                {showNivel && p.nivel && (
                  <td style={tdStyle}>
                    <TwemojiImg
                      codepoint={NIVEL_CODEPOINTS[p.nivel.label] || "1f947"}
                      size={20}
                      alt={p.nivel.label}
                    />
                    {" "}{p.nivel.label}
                  </td>
                )}
                <td style={tdStyle}>{p.score ?? p.xp ?? 0}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

const tabela = { width: "100%", borderCollapse: "collapse" };
const thStyle = {
  padding: "10px", fontSize: "12px",
  color: "var(--texto-suave)", borderBottom: "2px solid var(--borda)",
  textAlign: "center"
};
const trStyle = { borderBottom: "1px solid var(--borda)" };
const tdStyle = { padding: "12px", fontSize: "15px", textAlign: "center" };