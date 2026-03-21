import { useState } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("aluno"); // Valor padrão

  // Função de registro
  const registrar = async () => {
    try {
      const credenciais = await createUserWithEmailAndPassword(auth, email, senha);
      const user = credenciais.user;

      // Criar documento no Firestore
      await setDoc(doc(db, "usuarios", user.uid), {
        email: user.email,
        tipo: tipo, // "aluno" ou "professor"
        criadoEm: new Date(),
      });

      alert(`Usuário criado como ${tipo}!`);
    } catch (erro) {
      console.error(erro);
      alert("Erro ao registrar: " + erro.message);
    }
  };

  // Função de login
  const login = async () => {
    try {
      const credenciais = await signInWithEmailAndPassword(auth, email, senha);
      const user = credenciais.user;

      // Puxar dados do Firestore
      const docSnap = await getDoc(doc(db, "usuarios", user.uid));
      if (docSnap.exists()) {
        const dados = docSnap.data();
        alert(`Login feito! Tipo de usuário: ${dados.tipo}`);
      } else {
        alert("Login feito, mas dados do usuário não encontrados.");
      }
    } catch (erro) {
      console.error(erro);
      alert("Erro no login: " + erro.message);
    }
  };

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

      {/* Select para escolher tipo de usuário */}
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      >
        <option value="aluno">Aluno</option>
        <option value="professor">Professor</option>
      </select>

      <br />

      <button onClick={login} style={{ marginRight: 10 }}>Entrar</button>
      <button onClick={registrar}>Registrar</button>
    </div>
  );
}

export default Login;