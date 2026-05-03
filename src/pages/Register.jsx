import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [verSenha, setVerSenha] = useState(false);
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
    <>
      <style>
        {`
          input[type="password"]::-ms-reveal,
          input[type="password"]::-ms-clear {
            display: none;
          }
        `}
      </style>

      <div style={{
        height: "100vh", display: "flex",
        justifyContent: "center", alignItems: "center",
        background: "transparent"
      }}>
        <div style={{
          width: "320px", padding: "25px",
          background: "var(--bg-card)", borderRadius: "10px",
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

          <div style={{ position: "relative", marginBottom: "10px" }}>
            <input
              id="password"
              name="password"
              type={verSenha ? "text" : "password"}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              style={{ ...inputStyle, marginBottom: 0, paddingRight: "40px" }}
            />
            <button
              onClick={() => setVerSenha(v => !v)}
              style={olhinhoStyle}
              type="button"
              tabIndex={-1}
            >
              {verSenha ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {erro && <p style={{ color: "var(--cor-primaria)", fontSize: "14px" }}>{erro}</p>}

          <button
            onClick={handleRegister}
            style={{ width: "100%", marginTop: "10px" }}
          >
            Criar conta
          </button>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box"
};
const olhinhoStyle = {
  position: "absolute",
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "18px", 
  padding: "0",
  color: "#000000", 
  display: "flex",
  alignItems: "center",
  transition: "0.2s"
};