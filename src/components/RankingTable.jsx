import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import NivelIcon from "../components/NivelIcon";

export default function RankingTable({ players, highlightUserId, showNivel = false }) {
  if (!players || players.length === 0) return null;

  const MEDALHAS_LOTTIE = [
    "https://lottie.host/2343a230-9b99-40c3-a285-9b203bb7e56d/aI7UINriXI.lottie",
    "https://lottie.host/7fe34abf-14f7-4faa-a8f5-099531a4963f/GYVoESveyq.lottie",
    "https://lottie.host/b368509d-ba63-4d17-b951-718550f790e3/TJZWo4dVAg.lottie",
  ];

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
                    ? <DotLottieReact
                      src={MEDALHAS_LOTTIE[i]}
                      autoplay
                      loop
                      style={{ width: 20, height: 20, display: "inline-block" }}
                      />
                    : i + 1
                  }
                </td>
                <td style={{ ...tdStyle, textAlign: "left" }}>{p.nome}</td>
                {showNivel && p.nivel && p.nivel.label !== "-" && (
                  <td style={tdStyle}>
                    <NivelIcon nivel={p.nivel.label} size={24} />
                    {" "}{p.nivel.label}
                  </td>
                )}
                {showNivel && (!p.nivel || p.nivel.label === "-") && (
                  <td style={tdStyle}>
                    <span style={{ color: "var(--texto-muito-suave)", fontSize: "13px" }}>-</span>
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