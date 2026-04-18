import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { useClasses } from "../hooks/useClasses";
import { useCourses } from "../hooks/useCourses";

function DashboardAluno() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { getEnrolledClassIds } = useClasses();
  const { getCourseById } = useCourses();

  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!user) return;

      const classIds = await getEnrolledClassIds(user.uid);

      const { getDocs, query, collection, where, doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../services/firebase");

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
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>
        <button onClick={logout} style={buttonLogout}>Sair</button>
      </div>

      <div style={card}>
        <h2>Minhas Disciplinas</h2>

        {loading ? (
          <p>Carregando...</p>
        ) : disciplinas.length === 0 ? (
          <p>Você ainda não está matriculado em nenhuma disciplina.</p>
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
        <button onClick={() => navigate("/entrar")} style={buttonPrimary}>
          Entrar com código
        </button>
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "#f5f5f5", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto 30px auto", padding: "20px",
  background: "#fff", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const buttonPrimary = {
  padding: "10px 15px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "white", cursor: "pointer", fontWeight: "bold"
};
const buttonLogout = {
  marginTop: "10px", padding: "8px 12px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: "bold"
};
const cardButton = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid #ccc",
  background: "#f9f9f9", cursor: "pointer"
};

export default DashboardAluno;