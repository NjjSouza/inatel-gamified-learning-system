import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async () => {
    try {
      await login(email, senha);
    } catch (erro) {
      alert("Erro no login: " + erro.message);
    }
  };

  useEffect(() => {
    if (user?.tipo === "professor") {
      navigate("/professor");
    } else if (user?.tipo === "aluno") {
      navigate("/aluno");
    }
  }, [user]);

  return (
    <div style={{ maxWidth: 300, margin: "0 auto", textAlign: "center" }}>
      <h2>G-Learning Login</h2>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        onChange={(e) => setSenha(e.target.value)}
      />

      <button onClick={handleLogin}>
        Entrar
      </button>

      <button onClick={() => navigate("/registrar")}>
        Criar conta
      </button>
  </div>
);
}

export default Login;