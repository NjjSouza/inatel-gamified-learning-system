import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { useClasses } from "../hooks/useClasses";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import Spinner from "../components/Spinner";

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
        const docSnap = await getDoc(doc(db, "usuarios", data.professorId));
        if (docSnap.exists()) setProfessor(docSnap.data());
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
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  if (!course) return <Spinner />;

  return (
    <div style={container}>
      <div style={header}>
        <h1>{course.nome}</h1>
        <p>Professor: {professor?.nome || professor?.email}</p>
      </div>

      <div style={card}>
        <h2>Turmas</h2>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
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
          <p>Nenhuma turma cadastrada para esta disciplina.</p>
        ) : (
          classes.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/professor/curso/${courseId}/turma/${c.id}`)}
              style={{
                ...cardButton,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingRight: "15px"
              }}
            >
              <span>{c.semestre}</span>
              <span style={{
                fontSize: "12px",
                color: c.status === "active" ? "#4CAF50" : "#999"
              }}>
                {c.status === "active" ? "Ativa" : "Encerrada"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "#f5f5f5", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "700px", margin: "0 auto 30px auto", padding: "20px",
  background: "#fff", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const inputStyle = {
  padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px"
};
const buttonPrimary = {
  padding: "10px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonVoltar = {
  padding: "8px 16px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer"
};
const cardButton = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid #ccc",
  background: "#f9f9f9", cursor: "pointer", textAlign: "left"
};

export default CoursePageProfessor;