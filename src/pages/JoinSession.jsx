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

    await joinSession(session.id); 

    navigate(`/aluno/sessao/${session.id}`);
  };

  return (
    <div>
      <h1>Entrar na sessão</h1>

      <input
        type="text"
        placeholder="Digite o PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button onClick={handleJoin}>
        Entrar
      </button>

      {error && <p>{error}</p>}
    </div>
  );
}