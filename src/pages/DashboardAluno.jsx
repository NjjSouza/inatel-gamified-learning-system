import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function DashboardAluno() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={container}>
      <div style={header}>
        <h1>Área do Aluno</h1>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>

        <button onClick={logout} style={buttonLogout}>
          Sair
        </button>
      </div>

      <div style={card}>
        <h2>Entrar em uma sessão</h2>

        <button
          onClick={() => navigate("/entrar")}
          style={buttonPrimary}
        >
          Entrar com código
        </button>
      </div>
    </div>
  );
}

const container = {
  minHeight: "100vh",
  background: "#f5f5f5",
  padding: "30px"
};

const header = {
  textAlign: "center",
  marginBottom: "30px"
};

const card = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  textAlign: "center"
};

const buttonPrimary = {
  padding: "10px 15px",
  borderRadius: "8px",
  border: "none",
  background: "#4CAF50",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const buttonLogout = {
  marginTop: "10px",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};

export default DashboardAluno;