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
    <div style={container}>
      
      <div style={header}>
        <h1>Gerenciar Quizzes</h1>
        <p>Organize, edite e crie novos quizzes</p>
      </div>

      <div style={card}>
        
        <button
          onClick={() => navigate(`/criar-quiz/${courseId}`)}
          style={buttonPrimary}
        >
          + Criar Quiz
        </button>

        {quizzes.length === 0 ? (
          <p style={{ marginTop: "20px" }}>Nenhum quiz criado</p>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {quizzes.map((q) => (
              <div key={q.id} style={quizCard}>
                
                <strong>{q.nome}</strong>

                <div style={actions}>
                  <button
                    onClick={() => navigate(`/professor/quiz/${q.id}`)}
                    style={buttonPrimary}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(q.id)}
                    style={buttonDanger}
                  >
                    Excluir
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const container = {
  minHeight: "100vh",
  background: "#f5f5f5",
  padding: "30px"
};

const header = {
  textAlign: "center",
  marginBottom: "30px"
};

const card = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "20px",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  textAlign: "center"
};

const quizCard = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "15px",
  marginBottom: "15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const actions = {
  display: "flex",
  gap: "10px"
};

const buttonPrimary = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  background: "#4CAF50",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};

const buttonDanger = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  background: "#f44336",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};