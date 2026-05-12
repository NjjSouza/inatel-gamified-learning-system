import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../hooks/useCourses";
import { useQuizzes } from "../hooks/useQuizzes";
import { useNavigate } from "react-router-dom";

function DashboardProfessor() {
  const { user } = useAuth();
  const { createCourse, getCourses } = useCourses();
  const { createQuiz, getQuizzes, deleteQuiz } = useQuizzes();
  const navigate = useNavigate();

  const [nomeCurso, setNomeCurso] = useState("");
  const [courses, setCourses] = useState([]);
  const [nomeQuiz, setNomeQuiz] = useState("");
  const [quizzes, setQuizzes] = useState([]);

  const fetchCourses = async () => { setCourses(await getCourses()); };
  const fetchQuizzes = async () => { setQuizzes(await getQuizzes()); };

  useEffect(() => { fetchCourses(); fetchQuizzes(); }, []);

  const handleCreateCourse = async () => {
    if (!nomeCurso.trim()) return;
    try {
      await createCourse(nomeCurso.trim());
      setNomeCurso("");
      await fetchCourses();
    } catch (e) { alert("Erro: " + e.message); }
  };

  const handleCreateQuiz = async () => {
    if (!nomeQuiz.trim()) return alert("Digite o nome do quiz");
    try {
      const quiz = await createQuiz(nomeQuiz.trim());
      setNomeQuiz("");
      await fetchQuizzes();
      navigate(`/professor/quiz/${quiz.id}`);
    } catch (e) { alert("Erro: " + e.message); }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm("Tem certeza que deseja excluir este quiz?")) return;
    try {
      await deleteQuiz(quizId);
      await fetchQuizzes();
    } catch (e) { alert("Erro ao excluir: " + e.message); }
  };

  return (
    <div style={container}>
      <div style={header}>
        <h1>Área do Professor</h1>
        <p style={{ color: "var(--texto-suave)" }}>Bem-vindo, {user?.nome || "Usuário"}</p>
      </div>

      {/* Disciplinas */}
      <div style={card}>
        <h2>Minhas Disciplinas</h2>
        <div style={inputRow}>
          <input
            type="text" placeholder="Nome da disciplina"
            value={nomeCurso} onChange={(e) => setNomeCurso(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateCourse} style={buttonPrimary}>Criar</button>
        </div>
        {courses.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhuma disciplina criada</p>
        ) : (
          courses.map((course) => (
            <button key={course.id} onClick={() => navigate(`/professor/curso/${course.id}`)} style={cardButton}>
              {course.nome}
            </button>
          ))
        )}
      </div>

      {/* Quizzes */}
      <div style={card}>
        <h2>Meus Quizzes</h2>
        <div style={inputRow}>
          <input
            type="text" placeholder="Nome do quiz"
            value={nomeQuiz} onChange={(e) => setNomeQuiz(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateQuiz} style={buttonPrimary}>Criar</button>
        </div>
        {quizzes.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhum quiz criado</p>
        ) : (
          quizzes.map((q) => (
            <div key={q.id} style={quizCard}>
              <span style={{ color: "var(--texto)", fontWeight: "600" }}>{q.nome}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => navigate(`/professor/quiz/${q.id}`)} style={buttonPrimary}>
                  Editar
                </button>
                <button onClick={() => handleDeleteQuiz(q.id)} style={buttonPerigo}>
                  Excluir
                </button>
              </div>
            </div>
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
  padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "14px", flex: 1, boxSizing: "border-box",
};
const buttonPrimary = {
  padding: "10px 16px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap",
};
const buttonPerigo = {
  padding: "10px 16px", borderRadius: "8px", border: "none",
  background: "var(--cor-perigo)", color: "#fff",
  cursor: "pointer", fontWeight: "bold",
};
const cardButton = {
  width: "100%", padding: "12px 16px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  cursor: "pointer", textAlign: "left", fontWeight: "600",
};
const quizCard = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 16px", marginBottom: "10px",
  border: "1px solid var(--borda)", borderRadius: "8px",
  background: "var(--bg-input)",
};

export default DashboardProfessor;