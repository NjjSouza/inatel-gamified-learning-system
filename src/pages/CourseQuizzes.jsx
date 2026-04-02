import { useAuth } from "../contexts/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuizzes } from "../hooks/useQuizzes";

export default function CourseQuizzes() {
  const { user } = useAuth();
  const { courseId } = useParams();
  const { getQuizzes } = useQuizzes();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await getQuizzes(courseId);
      setQuizzes(data);
    };

    fetch();
  }, [courseId]);

  return (
    <div>
      <h1>Quizzes da disciplina</h1>

      {user?.tipo === "professor" && (
        <button onClick={() => navigate(`/criar-quiz/${courseId}`)}>
          Criar Quiz
        </button>
      )}

      <ul>
        {quizzes.map(q => (
          <li key={q.id}>
            <button onClick={() => navigate(`/professor/quiz/${q.id}`)}>
              {q.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}