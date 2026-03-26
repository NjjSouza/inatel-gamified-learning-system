import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login, signup, user } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("aluno");

  const handleLogin = async () => {
    try {
      await login(email, senha);
    } catch (erro) {
      alert("Erro no login: " + erro.message);
    }
  };

  const handleRegister = async () => {
    try {
      await signup(email, senha, tipo);
      alert(`Usuário criado como ${tipo}!`);
    } catch (erro) {
      alert("Erro ao registrar: " + erro.message);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.tipo === "professor") {
        navigate("/professor");
      } else {
        navigate("/aluno");
      }
    }
  }, [user]);

  return (
    <div style={{ maxWidth: 300, margin: "0 auto", textAlign: "center" }}>
      <h2>G-Learning Login</h2>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Senha"
        onChange={(e) => setSenha(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      >
        <option value="aluno">Aluno</option>
        <option value="professor">Professor</option>
      </select>

      <button onClick={handleLogin} style={{ marginRight: 10 }}>
        Entrar
      </button>

      <button onClick={handleRegister}>
        Registrar
      </button>
    </div>
  );
}

export default Login;