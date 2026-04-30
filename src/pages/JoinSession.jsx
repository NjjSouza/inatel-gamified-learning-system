import { useState } from "react";
import { useSessions } from "../hooks/useSessions";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
      if (!session) {
        setError("Código inválido ou sessão não encontrada.");
        return;
      }
      if (session.status === "finished") {
        setError("Esta sessão já foi encerrada pelo professor.");
        return;
      }
      await joinSession(session.id);
      navigate(`/aluno/sessao/${session.id}`);
    } catch (e) {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={card}>
        {/* Animação de entrada */}
        <DotLottieReact
          src="https://lottie.host/c2c128c4-cea9-4aca-a496-8a84dc74d7f2/LgpJ2VitEf.lottie"
          autoplay
          loop
          style={{ width: 200, height: 200, margin: "0 auto" }}
        />

        <h1 style={title}>Entrar em uma sessão</h1>
        <p style={subtitle}>Digite o código fornecido pelo professor</p>

        <input
          type="text"
          placeholder="Código da sessão"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          style={inputStyle}
        />

        <button
          onClick={handleJoin}
          disabled={loading}
          style={{ ...buttonPrimary, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Verificando..." : "Confirmar"}
        </button>

        {error && <p style={errorText}>{error}</p>}
      </div>
    </div>
  );
}

const container = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center",
  background: "#f5f5f5", paddingTop: "56px"
};
const card = {
  width: "100%", maxWidth: "400px", padding: "32px",
  background: "#fff", borderRadius: "12px",
  boxShadow: "0 0 16px rgba(0,0,0,0.08)", textAlign: "center"
};
const title = { margin: "16px 0 8px", fontSize: "22px", color: "#333" };
const subtitle = { margin: "0 0 24px", fontSize: "14px", color: "#888" };
const inputStyle = {
  width: "100%", padding: "12px", marginBottom: "12px",
  borderRadius: "8px", border: "1px solid #ccc",
  fontSize: "16px", boxSizing: "border-box",
  textAlign: "center", fontFamily: "inherit"
};
const buttonPrimary = {
  width: "100%", padding: "12px", borderRadius: "8px",
  border: "none", background: "#4CAF50", color: "#fff",
  fontSize: "16px", fontWeight: "bold", cursor: "pointer"
};
const errorText = { marginTop: "12px", color: "#f44336", fontSize: "14px" };