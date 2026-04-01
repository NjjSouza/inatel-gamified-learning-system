import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";

function CoursePage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { getCourseById } = useCourses();
  const { getSessionsByCourse, createSession } = useSessions();
  const { getQuizzes } = useQuizzes();

  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCourseById(courseId);
        setCourse(data);

        if (data?.professorId) {
          const docRef = doc(db, "usuarios", data.professorId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setProfessor(docSnap.data());
          }
        }

        const sessionsData = await getSessionsByCourse(courseId);
        sessionsData.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setSessions(sessionsData);
        
        const quizzesData = await getQuizzes(courseId);
        setQuizzes(quizzesData);

      } catch (erro) {
        alert(erro.message);
      }
    };

    fetchData();
  }, [courseId]);

  const handleCreateSession = async () => {
    try {
      if (!selectedQuiz) {
        alert("Selecione um quiz primeiro!");
      return;
      }

      const session = await createSession(selectedQuiz.id, courseId);

      alert(`Sessão criada! PIN: ${session.pin}`);

      const updated = await getSessionsByCourse(courseId);
      setSessions(updated);

    } catch (erro) {
      alert("Erro ao criar sessão: " + erro.message);
    }
  };

  if (!course) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <button onClick={() => navigate(-1)}>
        Voltar
      </button>

      <h1>{course.nome}</h1>

      <p>
        Professor: {professor?.nome || professor?.email || "Carregando..."}
      </p>

      <h2>Sessões da disciplina</h2>

      {user?.tipo === "professor" && (
        <button
          onClick={handleCreateSession}
          disabled={!selectedQuiz}
        >
          Criar Sessão
        </button>
      )}

      {sessions.length === 0 ? (
        <p>Nenhuma sessão ainda</p>
      ) : (
        <ul>
          {sessions.map((s) => (
            <li key={s.id}>
              PIN: {s.pin} 
              <span style={{ color: s.status === "waiting" ? "orange" : "green" }}>
                ({s.status})
              </span>
              {" - "}
              Quiz: {quizzes.find(q => q.id === s.quizId)?.nome || "?"}
            </li>
          ))}
        </ul>
      )}

      <h2>Quizzes</h2>

      {quizzes.length === 0 ? (
        <p>Nenhum quiz criado</p>
      ) : (
        <ul>
          {quizzes.map((q) => (
            <li key={q.id}>
              <button 
                onClick={() => setSelectedQuiz(q)}
                style={{
                  backgroundColor: selectedQuiz?.id === q.id ? "#ccc" : ""
                }}
              >
                {q.nome}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedQuiz && (
        <p>Selecionado: {selectedQuiz.nome}</p>
      )}

      <button onClick={() => navigate(`/professor/curso/${courseId}/quizzes`)}>
        Ver Quizzes
      </button>
    </div>
  );
}

export default CoursePage;