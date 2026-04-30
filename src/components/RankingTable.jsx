import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function RankingTable({ players, highlightUserId }) {
  if (!players || players.length === 0) return null;

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
            <th style={thStyle}>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <tr key={p.id} style={{
                ...trStyle,
                background: p.id === highlightUserId
                  ? "#f0fff0"
                  : i === 0 ? "#fffde7" : "transparent",
                fontWeight: p.id === highlightUserId ? "bold" : "normal",
              }}>
                <td style={tdStyle}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td style={{ ...tdStyle, textAlign: "left" }}>{p.nome}</td>
                <td style={tdStyle}>{p.score}</td>
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
  color: "#888", borderBottom: "2px solid #eee", textAlign: "center"
};
const trStyle = { borderBottom: "1px solid #f0f0f0" };
const tdStyle = { padding: "12px", fontSize: "15px", textAlign: "center" };