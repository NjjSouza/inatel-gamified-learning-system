import { useState } from "react";
import { useSessions } from "../hooks/useSessions";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import BackButton from "../components/BackButton";

export default function JoinSession() {
  const { getSessionByPin, joinSession } = useSessions();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError("");
    setLoading(true);
    try {
      const session = await getSessionByPin(pin.trim());
      if (!session) { setError("Código inválido ou sessão não encontrada."); return; }
      if (session.status === "finished") { setError("Esta sessão já foi encerrada pelo professor."); return; }
      await joinSession(session.id);
      navigate(`/aluno/sessao/${session.id}`);
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrap}>
      <div style={card}>
        <BackButton />
        <DotLottieReact
          src="https://lottie.host/c2c128c4-cea9-4aca-a496-8a84dc74d7f2/LgpJ2VitEf.lottie"
          autoplay loop
          style={{ width: 180, height: 180, margin: "0 auto" }}
        />
        <h1 style={title}>Entrar em uma sessão</h1>
        <p style={subtitle}>Digite o código fornecido pelo professor</p>

        <input
          type="text" placeholder="Código da sessão"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          style={inputStyle}
        />

        <button onClick={handleJoin} disabled={loading} style={{ ...buttonPrimary, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Verificando..." : "Confirmar"}
        </button>

        {error && <p style={errorText}>{error}</p>}
      </div>
    </div>
  );
}

const pageWrap = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center",
  background: "transparent", paddingTop: "56px",
};
const card = {
  width: "100%", maxWidth: "400px", padding: "32px",
  background: "var(--bg-card)", borderRadius: "14px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const title = { margin: "16px 0 8px", fontSize: "22px", color: "var(--texto)" };
const subtitle = { margin: "0 0 24px", fontSize: "14px", color: "var(--texto-muito-suave)" };
const inputStyle = {
  width: "100%", padding: "12px", marginBottom: "12px",
  borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "18px", boxSizing: "border-box",
  textAlign: "center", fontFamily: "inherit", letterSpacing: "0.1em",
};
const buttonPrimary = {
  width: "100%", padding: "12px", borderRadius: "8px",
  border: "none", background: "var(--cor-primaria)", color: "#fff",
  fontSize: "16px", fontWeight: "bold", cursor: "pointer",
};
const errorText = {
  marginTop: "12px", color: "var(--cor-perigo)", fontSize: "14px",
};