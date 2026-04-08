import { useAuth } from "../contexts/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuizzes } from "../hooks/useQuizzes";

export default function CourseQuizzes() {
  const { user } = useAuth();
  const { courseId } = useParams();
  const { getQuizzes, deleteQuiz } = useQuizzes();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);

  const fetchQuizzes = async () => {
    const data = await getQuizzes(courseId);
    setQuizzes(data);
  };

  useEffect(() => {
    fetchQuizzes();
  }, [courseId]);

  const handleDelete = async (quizId) => {
    const confirmar = confirm("Tem certeza que deseja excluir este quiz?");

    if (!confirmar) return;

    try {
      await deleteQuiz(quizId);
      await fetchQuizzes(); 
    } catch (erro) {
      alert("Erro ao excluir: " + erro.message);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Gerenciar Quizzes</h1>

      <button onClick={() => navigate(`/criar-quiz/${courseId}`)}>
        Criar Quiz
      </button>

      <ul style={{ marginTop: "20px" }}>
        {quizzes.map(q => (
          <li
            key={q.id}
            style={{
              marginBottom: "10px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px"
            }}
          >
            <strong>{q.nome}</strong>

            <div style={{ marginTop: "5px" }}>
              <button onClick={() => navigate(`/professor/quiz/${q.id}`)}>
                Editar
              </button>

              <button
                onClick={() => handleDelete(q.id)}
                style={{ marginLeft: "10px", color: "red" }}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}