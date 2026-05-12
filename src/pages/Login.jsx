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
    if (user?.tipo === "professor") navigate("/professor");
    else if (user?.tipo === "aluno") navigate("/aluno");
  }, [user]);

  return (
    <>
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>

      <div style={pageWrap}>
        <div style={card}>
          <img
            src="/logo.png"
            alt="Inatelligent"
            style={{ width: "100%", maxWidth: "260px", height: "auto",
                     objectFit: "contain", display: "block", margin: "0 auto 24px" }}
          />

          <input
            id="email" name="email" type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={inputStyle}
          />

          <div style={{ position: "relative", marginBottom: "10px" }}>
            <input
              id="password" name="password"
              type={verSenha ? "text" : "password"}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ ...inputStyle, marginBottom: 0, paddingRight: "40px" }}
            />
            <button onClick={() => setVerSenha(v => !v)} style={olhinhoStyle} type="button" tabIndex={-1}>
              {verSenha ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {erro && <p style={erroStyle}>{erro}</p>}

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button style={{ ...btnPrimario, flex: 1 }} onClick={handleLogin}>
              Entrar
            </button>
            <button style={{ ...btnSecundario, flex: 1 }} onClick={() => navigate("/registrar")}>
              Primeiro Acesso
            </button>
          </div>

          <p style={alunoHint}>
            Para alunos: aguarde a confirmação de seu professor {" "}
            para poder realizar seu primeiro acesso. 
          </p>
        </div>
      </div>
    </>
  );
}

const pageWrap = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "transparent",
};

const card = {
  width: "100%",
  maxWidth: "380px",
  padding: "36px 32px",
  background: "var(--bg-card)",
  borderRadius: "14px",
  boxShadow: "var(--sombra-card)",
  border: "1px solid var(--borda)",
  textAlign: "center",
};

const inputStyle = {
  width: "100%", padding: "11px 12px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "15px", boxSizing: "border-box",
};

const btnPrimario = {
  padding: "11px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "15px", cursor: "pointer",
  transition: "background 0.2s",
};

const btnSecundario = {
  padding: "11px", borderRadius: "8px",
  border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontWeight: "bold", fontSize: "15px", cursor: "pointer",
};

const olhinhoStyle = {
  position: "absolute", right: "10px", top: "50%",
  transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  fontSize: "18px", padding: "0",
  color: "var(--texto-suave)",
  display: "flex", alignItems: "center",
};

const erroStyle = {
  color: "var(--cor-perigo)",
  fontSize: "14px",
  margin: "4px 0",
};

const alunoHint = {
  marginTop: "20px",
  fontSize: "12px",
  color: "var(--texto-muito-suave)",
  lineHeight: 1.5,
  textAlign: "left",
  borderTop: "1px solid var(--borda)",
  paddingTop: "14px",
};

export default Login;