import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

function CoursePageProfessor() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const { getCourseById } = useCourses();
  const { listenSessionsByCourse, createSession, startSession } = useSessions();
  const { getQuizzes } = useQuizzes();

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
          if (docSnap.exists()) setProfessor(docSnap.data());
        }

        const quizzesData = await getQuizzes(courseId);
        setQuizzes(quizzesData);

      } catch (erro) {
        alert(erro.message);
      }
    };

    fetchData();
  }, [courseId]);

  useEffect(() => {
    const unsubscribe = listenSessionsByCourse(courseId, (data) => {
      data.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setSessions(data);
    });

    return () => unsubscribe();
  }, [courseId]);

  const handleCreateSession = async () => {
    if (!selectedQuiz) {
      alert("Selecione um quiz primeiro!");
      return;
    }

    try {
      const session = await createSession(selectedQuiz.id, courseId);
      alert(`Sessão criada! PIN: ${session.pin}`);
    } catch (erro) {
      console.error(erro);
      alert("Erro ao criar sessão: " + erro.message);
    }
  };

  const statusMap = {
    waiting: { label: "Aguardando", color: "orange" },
    playing: { label: "Em andamento", color: "green" },
    finished: { label: "Finalizada", color: "red" }
  };

  if (!course) return <p>Carregando...</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)}>Voltar</button>

      <h1>{course.nome}</h1>
      <p>Professor: {professor?.nome || professor?.email}</p>

      <h2>Sessões</h2>

      {selectedQuiz ? (
        <button onClick={handleCreateSession}>
          Criar Sessão
        </button>
      ) : (
        <p>Selecione um quiz para criar uma sessão</p>
      )}

      {sessions.length === 0 ? (
        <p>Nenhuma sessão ainda</p>
      ) : (
        <ul>
          {sessions.map((s) => {
            const quiz = quizzes.find(q => q.id === s.quizId);

            return (
              <li key={s.id}>
                <strong>PIN:</strong> {s.pin}

                {" | "}
                <span
                  style={{
                    color: statusMap[s.status]?.color,
                    fontWeight: "bold"
                  }}
                >
                  {statusMap[s.status]?.label}
                </span>

                {" | "}
                <span>Quiz: {quiz?.nome || "?"}</span>

                {s.status === "waiting" && (
                  <button onClick={() => startSession(s.id)}>
                    Iniciar
                  </button>
                )}
              </li>
            );
          })}
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

      {selectedQuiz && <p>Selecionado: {selectedQuiz.nome}</p>}

      <button onClick={() => navigate(`/professor/curso/${courseId}/quizzes`)}>
        Gerenciar Quizzes
      </button>
    </div>
  );
}

export default CoursePageProfessor;