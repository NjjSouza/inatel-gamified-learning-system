import { useState } from "react";
import { useSessions } from "../hooks/useSessions";
import { useNavigate } from "react-router-dom";

export default function JoinSession() {
  const { getSessionByPin, joinSession } = useSessions();
  const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setError("");

    const session = await getSessionByPin(pin);

    if (!session) {
      setError("Sessão não encontrada");
      return;
    }

    if (session.status === "finished") {
      setError("Esta sessão já foi encerrada");
      return;
    }

    await joinSession(session.id);
    navigate(`/aluno/sessao/${session.id}`);
  };

  return (
    <div style={{
      padding: "20px",
      maxWidth: "400px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h1>Entrar na Sessão</h1>

      <input
        type="text"
        placeholder="Digite o PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
      />

      <button onClick={handleJoin} style={{ padding: "10px 20px" }}>
        Entrar
      </button>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}