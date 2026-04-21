import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../hooks/useCourses";
import { useQuizzes } from "../hooks/useQuizzes";
import { useNavigate } from "react-router-dom";

function DashboardProfessor() {
  const { user, logout } = useAuth();
  const { createCourse, getCourses } = useCourses();
  const { createQuiz, getQuizzes, deleteQuiz } = useQuizzes();
  const navigate = useNavigate();

  const [nomeCurso, setNomeCurso] = useState("");
  const [courses, setCourses] = useState([]);
  const [nomeQuiz, setNomeQuiz] = useState("");
  const [quizzes, setQuizzes] = useState([]);

  const fetchCourses = async () => {
    const data = await getCourses();
    setCourses(data);
  };

  const fetchQuizzes = async () => {
    const data = await getQuizzes();
    setQuizzes(data);
  };

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, []);

  const handleCreateCourse = async () => {
    if (!nomeCurso.trim()) return;
    try {
      await createCourse(nomeCurso.trim());
      setNomeCurso("");
      await fetchCourses();
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  const handleCreateQuiz = async () => {
    if (!nomeQuiz.trim()) return alert("Digite o nome do quiz");
    try {
      const quiz = await createQuiz(nomeQuiz.trim());
      setNomeQuiz("");
      await fetchQuizzes();
      navigate(`/professor/quiz/${quiz.id}`);
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm("Tem certeza que deseja excluir este quiz?")) return;
    try {
      await deleteQuiz(quizId);
      await fetchQuizzes();
    } catch (erro) {
      alert("Erro ao excluir: " + erro.message);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <h1>Área do Professor</h1>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>
      </div>

      {/* Disciplinas */}
      <div style={card}>
        <h2>Minhas Disciplinas</h2>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Nome da disciplina"
            value={nomeCurso}
            onChange={(e) => setNomeCurso(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleCreateCourse} style={buttonPrimary}>
            Criar
          </button>
        </div>

        {courses.length === 0 ? (
          <p>Nenhuma disciplina criada</p>
        ) : (
          courses.map((course) => (
            <button
              key={course.id}
              onClick={() => navigate(`/professor/curso/${course.id}`)}
              style={cardButton}
            >
              {course.nome}
            </button>
          ))
        )}
      </div>

      {/* Quizzes */}
      <div style={card}>
        <h2>Meus Quizzes</h2>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Nome do quiz"
            value={nomeQuiz}
            onChange={(e) => setNomeQuiz(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleCreateQuiz} style={buttonPrimary}>
            Criar
          </button>
        </div>

        {quizzes.length === 0 ? (
          <p>Nenhum quiz criado</p>
        ) : (
          quizzes.map((q) => (
            <div key={q.id} style={quizCard}>
              <span>{q.nome}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => navigate(`/professor/quiz/${q.id}`)}
                  style={buttonPrimary}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteQuiz(q.id)}
                  style={buttonDanger}
                >
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

const container = { minHeight: "100vh", background: "#f5f5f5", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "700px", margin: "0 auto 30px auto", padding: "20px",
  background: "#fff", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const inputStyle = {
  padding: "10px", borderRadius: "6px",
  border: "1px solid #ccc", width: "100%", boxSizing: "border-box"
};
const buttonPrimary = {
  padding: "10px 15px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "white", cursor: "pointer", fontWeight: "bold"
};
const buttonLogout = {
  marginTop: "10px", padding: "8px 12px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonDanger = {
  padding: "8px 12px", borderRadius: "8px", border: "none",
  background: "#f44336", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const cardButton = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid #ccc",
  background: "#f9f9f9", cursor: "pointer"
};
const quizCard = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 15px", marginBottom: "10px",
  border: "1px solid #ccc", borderRadius: "8px"
};

export default DashboardProfessor;