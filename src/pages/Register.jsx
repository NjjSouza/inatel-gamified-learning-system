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
  const [tipo, setTipo] = useState("professor");
  const [erro, setErro] = useState("");
  const [verSenha, setVerSenha] = useState(false);

  const handleRegister = async () => {
    setErro("");
    if (!nome || !email || !senha) {
      setErro("Por favor, preencha todos os campos antes de continuar.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    try {
      await signup(email, senha, tipo, nome);
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado. Faça login na tela anterior.");
      } else {
        setErro("Algo deu errado. Tente novamente.");
      }
    }
  };

  return (
    <>
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>

      <div style={pageWrap}>
        <div style={card}>
          <h2 style={{ marginBottom: "6px", color: "var(--texto)" }}>Criar conta</h2>
          <p style={{ fontSize: "13px", color: "var(--texto-muito-suave)", marginBottom: "20px" }}>
            Preencha os dados abaixo para se cadastrar
          </p>

          {/* Seletor de tipo */}
          <div style={tipoRow}>
            <button
              type="button"
              onClick={() => setTipo("professor")}
              style={{ ...tipoBtn, ...(tipo === "professor" ? tipoBtnAtivo : {}) }}
            >
              Sou professor
            </button>
            <button
              type="button"
              onClick={() => setTipo("aluno")}
              style={{ ...tipoBtn, ...(tipo === "aluno" ? tipoBtnAtivo : {}) }}
            >
              Sou aluno
            </button>
          </div>

          {tipo === "aluno" && (
            <div style={alertaAluno}>
              <strong>Para alunos:</strong> use seu e-mail acadêmico.
            </div>
          )}

          <input
            id="nome" name="nome"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={inputStyle}
          />

          <input
            id="email" name="email" type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <div style={{ position: "relative", marginBottom: "10px" }}>
            <input
              id="password" name="password"
              type={verSenha ? "text" : "password"}
              placeholder="Senha (mínimo 6 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              style={{ ...inputStyle, marginBottom: 0, paddingRight: "40px" }}
            />
            <button onClick={() => setVerSenha(v => !v)} style={olhinhoStyle} type="button" tabIndex={-1}>
              {verSenha ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {erro && <p style={erroStyle}>{erro}</p>}

          <button onClick={handleRegister} style={btnPrimario}>
            Criar conta
          </button>

          <button onClick={() => navigate("/")} style={btnVoltar}>
            Voltar para o login
          </button>
        </div>
      </div>
    </>
  );
}

const pageWrap = {
  minHeight: "100vh",
  display: "flex", justifyContent: "center", alignItems: "center",
  background: "transparent",
};

const card = {
  width: "100%", maxWidth: "380px", padding: "32px 28px",
  background: "var(--bg-card)", borderRadius: "14px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};

const tipoRow = {
  display: "flex", gap: "8px", marginBottom: "16px",
};

const tipoBtn = {
  flex: 1, padding: "9px", borderRadius: "8px",
  border: "2px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto-suave)",
  fontWeight: "600", fontSize: "13px", cursor: "pointer",
  transition: "all 0.15s",
};

const tipoBtnAtivo = {
  background: "var(--cor-primaria-claro)",
  borderColor: "var(--cor-primaria)",
  color: "var(--cor-primaria-texto)",
};

const alertaAluno = {
  fontSize: "12px",
  background: "var(--cor-aviso-claro)",
  border: "1px solid var(--cor-aviso-borda)",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "14px",
  color: "var(--cor-aviso-texto)",
  textAlign: "left",
  lineHeight: 1.5,
};

const inputStyle = {
  width: "100%", padding: "11px 12px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "15px", boxSizing: "border-box",
};

const btnPrimario = {
  width: "100%", padding: "12px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "15px", cursor: "pointer",
  marginTop: "6px",
};

const btnVoltar = {
  width: "100%", padding: "10px", borderRadius: "8px", marginTop: "10px",
  border: "1px solid var(--borda)",
  background: "transparent", color: "var(--texto-suave)",
  fontSize: "14px", cursor: "pointer",
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
  color: "var(--cor-perigo)", fontSize: "14px", margin: "4px 0 8px",
};