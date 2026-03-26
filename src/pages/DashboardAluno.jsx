import { useAuth } from "../contexts/AuthContext";

function DashboardAluno() {
  const { logout } = useAuth();

  return (
    <div>
      <h1>Área do Aluno</h1>
      <button onClick={logout}>Sair</button>
    </div>
  );
}

export default DashboardAluno;