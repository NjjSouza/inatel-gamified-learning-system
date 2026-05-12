import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { useClasses } from "../hooks/useClasses";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

function DashboardAluno() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getEnrolledClassIds } = useClasses();

  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!user) return;
      const classIds = await getEnrolledClassIds(user.uid);
      const cursosMap = {};

      for (const classId of classIds) {
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (!classSnap.exists()) continue;
        const { courseId } = classSnap.data();
        if (cursosMap[courseId]) continue;
        const courseSnap = await getDoc(doc(db, "courses", courseId));
        if (courseSnap.exists()) {
          cursosMap[courseId] = { id: courseId, ...courseSnap.data() };
        }
      }

      setDisciplinas(Object.values(cursosMap));
      setLoading(false);
    };
    fetchDisciplinas();
  }, [user]);

  return (
    <div style={container}>
      <div style={header}>
        <h1>Área do Aluno</h1>
        <p style={{ color: "var(--texto-suave)" }}>Bem-vindo, {user?.nome || "Usuário"}</p>
      </div>

      <div style={card}>
        <h2>Minhas Disciplinas</h2>
        {loading ? (
          <p style={{ color: "var(--texto-suave)" }}>Carregando...</p>
        ) : disciplinas.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Você ainda não está matriculado em nenhuma disciplina.</p>
        ) : (
          disciplinas.map((curso) => (
            <button
              key={curso.id}
              onClick={() => navigate(`/aluno/curso/${curso.id}`)}
              style={cardButton}
            >
              {curso.nome}
            </button>
          ))
        )}
      </div>

      <div style={card}>
        <h2>Entrar em uma sessão</h2>
        <p style={{ color: "var(--texto-suave)", marginBottom: "16px", fontSize: "14px" }}>
          Use o código fornecido pelo seu professor
        </p>
        <button onClick={() => navigate("/entrar")} style={buttonPrimary}>
          Entrar com código
        </button>
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "transparent", padding: "30px" };
const header  = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto 30px auto", padding: "24px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const buttonPrimary = {
  padding: "11px 20px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  cursor: "pointer", fontWeight: "bold", fontSize: "15px",
};
const cardButton = {
  width: "100%", padding: "12px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  cursor: "pointer", fontWeight: "600",
  textAlign: "left", paddingLeft: "16px",
  transition: "background 0.15s",
};

export default DashboardAluno;