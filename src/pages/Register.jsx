import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleRegister = async () => {
    setErro("");
    if (!nome || !email || !senha) {
      setErro("Por favor, preencha todos os campos antes de continuar.");
      return;
    }
    try {
      await signup(email, senha, "professor", nome);
      navigate("/");
    } catch (err) {
      console.error(err);
      setErro("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <div style={{
      height: "100vh", display: "flex",
      justifyContent: "center", alignItems: "center",
      background: "#f5f5f5"
    }}>
      <div style={{
        width: "320px", padding: "25px",
        background: "white", borderRadius: "10px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
      }}>
        <h2>Cadastro de Professor</h2>

        <input
          id="nome"
          name="nome"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={inputStyle}
        />

        <input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          id="password"
          name="password"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
        />

        {erro && <p style={{ color: "red", fontSize: "14px" }}>{erro}</p>}

        <button
          onClick={handleRegister}
          style={{ width: "100%", marginTop: "10px" }}
        >
          Criar conta
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box"
};