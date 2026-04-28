import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

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
    <div style={{
      height: "100vh", display: "flex",
      justifyContent: "center", alignItems: "center",
      background: "#f5f5f5"
    }}>
      <div style={{
        width: "400px", padding: "35px 40px",
        background: "white", borderRadius: "12px",
        boxShadow: "0 0 20px rgba(0,0,0,0.1)", textAlign: "center"
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

        {erro && (
          <p style={{ color: "red", fontSize: "14px" }}>{erro}</p>
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
  );
}

const inputStyle = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box"
};

export default Login;