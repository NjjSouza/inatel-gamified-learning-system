import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const handleLogin = async () => {
    setErro("");
    try {
      await login(email, senha);
    } catch (err) {
      setErro("E-mail ou senha incorretos. Tente novamente.");
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
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "transparent"
      }}>
        <div style={{
          width: "400px",
          padding: "35px 40px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 0 20px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>

          <img
            src="/logo.png"
            alt="Inatelligent"
            style={{
              width: "100%",
              maxWidth: "300px",
              height: "auto",
              objectFit: "contain",
              display: "block",
              margin: "0 auto 20px"
            }}
          />

          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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

          {erro && (
            <p style={{ color: "red", fontSize: "14px" }}>
              {erro}
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button style={{ flex: 1 }} onClick={handleLogin}>
              Entrar
            </button>

            <button
              style={{ flex: 1 }}
              onClick={() => navigate("/registrar")}
            >
              Sou professor
            </button>
          </div>
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

export default Login;