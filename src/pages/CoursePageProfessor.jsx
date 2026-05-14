import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { useClasses } from "../hooks/useClasses";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import Spinner from "../components/Spinner";
import BackButton from "../components/BackButton";

function CoursePageProfessor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getCourseById } = useCourses();
  const { createClass, getClassesByCourse } = useClasses();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [classes, setClasses] = useState([]);
  const [newSemestre, setNewSemestre] = useState("");

  const fetchClasses = async () => {
    const data = await getClassesByCourse(courseId);
    setClasses(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getCourseById(courseId);
      setCourse(data);
      if (data?.professorId) {
        const snap = await getDoc(doc(db, "usuarios", data.professorId));
        if (snap.exists()) setProfessor(snap.data());
      }
      await fetchClasses();
    };
    fetchData();
  }, [courseId]);

  const handleCreateClass = async () => {
    if (!newSemestre.trim()) return alert("Digite o semestre");
    try {
      await createClass(courseId, newSemestre.trim());
      setNewSemestre("");
      await fetchClasses();
    } catch (e) { alert("Erro: " + e.message); }
  };

  if (!course) return <Spinner />;

  return (
    <div style={container}>
      <BackButton />
      <div style={header}>
        <h1>{course.nome}</h1>
        <p style={{ color: "var(--texto-suave)" }}>
          Professor: {professor?.nome || professor?.email}
        </p>
      </div>

      <div style={card}>
        <h2>Turmas</h2>
        <div style={inputRow}>
          <input
            placeholder="Semestre (ex: 2026/2)"
            value={newSemestre}
            onChange={(e) => setNewSemestre(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleCreateClass} style={buttonPrimary}>
            Criar Turma
          </button>
        </div>

        {classes.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>
            Nenhuma turma cadastrada para esta disciplina.
          </p>
        ) : (
          classes.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/professor/curso/${courseId}/turma/${c.id}`)}
              style={cardButton}
            >
              <span style={{ fontWeight: "600", color: "var(--texto)" }}>{c.semestre}</span>
              <span style={{
                fontSize: "12px",
                color: c.status === "active" ? "var(--cor-primaria)" : "var(--texto-muito-suave)",
                fontWeight: "bold",
              }}>
                {c.status === "active" ? "● Ativa" : "Encerrada"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "transparent", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "700px", margin: "0 auto 30px auto", padding: "24px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const inputRow = {
  display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px",
};
const inputStyle = {
  padding: "10px 12px", borderRadius: "8px",
  border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "14px", boxSizing: "border-box",
};
const buttonPrimary = {
  padding: "10px 16px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap",
};
const cardButton = {
  width: "100%", padding: "12px 16px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", cursor: "pointer",
  display: "flex", justifyContent: "space-between", alignItems: "center",
};

export default CoursePageProfessor;