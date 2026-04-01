import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("aluno");

  const handleRegister = async () => {
    try {
      await signup(email, senha, tipo, nome);
      alert("Conta criada!");
      navigate("/");
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  return (
    <div>
      <h2>Registrar</h2>

      <input placeholder="Nome" onChange={(e) => setNome(e.target.value)} />
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Senha" onChange={(e) => setSenha(e.target.value)} />

      <select onChange={(e) => setTipo(e.target.value)}>
        <option value="aluno">Aluno</option>
        <option value="professor">Professor</option>
      </select>

      <button onClick={handleRegister}>
        Registrar
      </button>
    </div>
  );
}