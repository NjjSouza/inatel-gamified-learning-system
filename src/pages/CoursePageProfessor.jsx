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
  const { listenSessionsByCourse, createSession, startSession, finishSession, nextQuestion } = useSessions();
  const { getQuizzes, getQuestions } = useQuizzes();
  const { listenPlayers } = useSessions();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questionsCount, setQuestionsCount] = useState({});
  const [showRanking, setShowRanking] = useState({});
  const [playersBySession, setPlayersBySession] = useState({});

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

  useEffect(() => {
    const fetchCounts = async () => {
      const counts = {};

      for (const quiz of quizzes) {
        const qs = await getQuestions(quiz.id);
        counts[quiz.id] = qs.length;
      }

      setQuestionsCount(counts);
    };

    if (quizzes.length) {
      fetchCounts();
    }
  }, [quizzes]);

  useEffect(() => {
    const unsubscribes = [];

    sessions.forEach((s) => {
      const unsub = listenPlayers(s.id, (players) => {
        setPlayersBySession(prev => ({
          ...prev,
          [s.id]: players
        }));
      });

      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [sessions]);

  useEffect(() => {
    const unsubscribes = [];

    sessions.forEach((s) => {
      const unsub = listenPlayers(s.id, (players) => {
        setPlayersBySession(prev => ({
          ...prev,
          [s.id]: players
        }));
      });

      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [sessions]);

  const handleCreateSession = async () => {
    if (!selectedQuiz) {
      alert("Selecione um quiz primeiro!");
      return;
    }

    try {
      const session = await createSession(selectedQuiz.id, courseId);
      alert(`Sessão criada! PIN: ${session.pin}`);
    } catch (erro) {
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
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>{course.nome}</h1>
      <p>Professor: {professor?.nome || professor?.email}</p>

      <h2 style={{ marginTop: "30px" }}>Sessões</h2>

      <div style={{ marginBottom: "15px" }}>
        {selectedQuiz ? (
          <button onClick={handleCreateSession}>
            Criar Sessão
          </button>
        ) : (
          <p>Selecione um quiz para criar uma sessão</p>
        )}
      </div>

      {sessions.length === 0 ? (
        <p>Nenhuma sessão ainda</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {sessions.map((s) => {
            const quiz = quizzes.find(q => q.id === s.quizId);
            const total = questionsCount[s.quizId] || 0;
            const current = (s.currentQuestionIndex ?? -1) + 1;

            return (
              <li
                key={s.id}
                style={{
                  listStyle: "none",
                  marginBottom: "15px",
                  padding: "15px",
                  border: "1px solid #ccc",
                  borderRadius: "10px"
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  <strong>PIN:</strong> {s.pin}
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <span
                    style={{
                      color: statusMap[s.status]?.color,
                      fontWeight: "bold"
                    }}
                  >
                    {statusMap[s.status]?.label}
                  </span>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  Quiz: {quiz?.nome || "?"}
                </div>

                {s.status === "playing" && (
                  <div style={{ marginBottom: "10px" }}>
                    Pergunta {current} de {total}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  {s.status === "waiting" && (
                    <button onClick={() => startSession(s.id)}>
                      Iniciar
                    </button>
                  )}

                  {s.status === "playing" && (
                    <>
                      <button
                        onClick={() =>
                          nextQuestion(s.id, s.currentQuestionIndex || 0)
                        }
                        disabled={
                          (s.currentQuestionIndex ?? 0) >= total - 1
                        }
                      >
                        Próxima Pergunta
                      </button>

                      <button onClick={() => finishSession(s.id)}>
                        Finalizar
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() =>
                    setShowRanking(prev => ({
                      ...prev,
                     [s.id]: !prev[s.id]
                    }))
                  }
                >
                  {showRanking[s.id] ? "Ocultar Ranking" : "Ver Ranking"}
                </button>

                {showRanking[s.id] && playersBySession[s.id]?.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <strong>Ranking:</strong>
                    <ul>
                      {playersBySession[s.id]
                        .sort((a, b) => b.score - a.score)
                        .map((p, index) => (
                          <li key={p.id}>
                            #{index + 1} — {p.nome} ({p.score} pts)
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2 style={{ marginTop: "30px" }}>Quizzes</h2>

      {quizzes.length === 0 ? (
        <p>Nenhum quiz criado</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {quizzes.map((q) => (
            <li
              key={q.id}
              style={{
                listStyle: "none",
                marginBottom: "10px"
              }}
            >
              <button
                onClick={() => setSelectedQuiz(q)}
                style={{
                  backgroundColor:
                    selectedQuiz?.id === q.id ? "#ddd" : "#f5f5f5",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  cursor: "pointer"
                }}
              >
                {q.nome}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedQuiz && (
        <p style={{ marginTop: "10px" }}>
          Selecionado: <strong>{selectedQuiz.nome}</strong>
        </p>
      )}

      <button
        style={{ marginTop: "20px" }}
        onClick={() =>
          navigate(`/professor/curso/${courseId}/quizzes`)
        }
      >
        Gerenciar Quizzes
      </button>
    </div>
  );
}

export default CoursePageProfessor;