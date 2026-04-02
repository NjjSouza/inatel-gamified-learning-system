import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function DashboardAluno() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleJoinSession = () => {
    navigate("/entrar");
  };

  return (
    <div>
      <h1>Área do Aluno</h1>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>
        <button onClick={logout}>Sair</button>
      </div>

      <h2>Entrar em uma sessão</h2>

      <button onClick={handleJoinSession}>
        Entrar com código
      </button>
    </div>
  );
}

export default DashboardAluno;