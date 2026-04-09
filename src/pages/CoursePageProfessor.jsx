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
  const { listenSessionsByCourse, createSession, startSession, finishSession, nextQuestion, listenPlayers } = useSessions();
  const { getQuizzes, getQuestions } = useQuizzes();

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
      const data = await getCourseById(courseId);
      setCourse(data);

      if (data?.professorId) {
        const docRef = doc(db, "usuarios", data.professorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProfessor(docSnap.data());
      }

      const quizzesData = await getQuizzes(courseId);
      setQuizzes(quizzesData);
    };

    fetchData();
  }, [courseId]);

  useEffect(() => {
    const unsubscribe = listenSessionsByCourse(courseId, setSessions);
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

    if (quizzes.length) fetchCounts();
  }, [quizzes]);

  useEffect(() => {
    const unsubs = sessions.map((s) =>
      listenPlayers(s.id, (players) => {
        setPlayersBySession((prev) => ({
          ...prev,
          [s.id]: players
        }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [sessions]);

  const handleCreateSession = async () => {
    if (!selectedQuiz) return alert("Selecione um quiz!");

    const session = await createSession(selectedQuiz.id, courseId);
    alert(`PIN: ${session.pin}`);
  };

  if (!course) return <p>Carregando...</p>;

  return (
    <div style={container}>
      <div style={header}>
        <h1>{course.nome}</h1>
        <p>Professor: {professor?.nome || professor?.email}</p>
      </div>

      <div style={card}>
        <h2>Quizzes</h2>

        {quizzes.map((q) => (
          <button
            key={q.id}
            onClick={() =>
              setSelectedQuiz(prev =>
                prev?.id === q.id ? null : q
              )
            }
            style={{
              ...cardButton,
              background: selectedQuiz?.id === q.id ? "#ddd" : "#f9f9f9"
            }}
          >
            {q.nome}
          </button>
        ))}

        {selectedQuiz && (
          <p style={{ marginTop: "5px" }}>
            Selecionado: <strong>{selectedQuiz.nome}</strong>
          </p>
        )}

        <button onClick={handleCreateSession} style={buttonPrimary}>
          Criar Sessão
        </button>
      </div>

      <div style={card}>
        <h2>Sessões</h2>

        {sessions.length === 0 ? (
          <p>Nenhuma sessão</p>
        ) : (
          sessions.map((s) => {
            const total = questionsCount[s.quizId] || 0;
            const current = (s.currentQuestionIndex ?? -1) + 1;

            return (
              <div key={s.id} style={sessionCard}>
                <p><strong>PIN:</strong> {s.pin}</p>
                <p>Status: {s.status}</p>

                {s.status === "playing" && (
                  <p>Pergunta {current} / {total}</p>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {s.status === "waiting" && (
                    <button onClick={() => startSession(s.id)} style={buttonPrimary}>
                      Iniciar
                    </button>
                  )}

                  {s.status === "playing" && (
                    <>
                      <button
                        onClick={() => nextQuestion(s.id, s.currentQuestionIndex || 0)}
                        style={buttonPrimary}
                      >
                        Próxima
                      </button>

                      <button onClick={() => finishSession(s.id)} style={buttonLogout}>
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
                  style={buttonLogout}
                >
                  Ranking
                </button>

                {showRanking[s.id] && playersBySession[s.id] && (
                  <ul>
                    {playersBySession[s.id]
                      .sort((a, b) => b.score - a.score)
                      .map((p, i) => (
                        <li key={p.id}>
                          #{i + 1} {p.nome} ({p.score})
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => navigate(`/professor/curso/${courseId}/quizzes`)}
        style={buttonPrimary}
      >
        Gerenciar Quizzes
      </button>
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
  margin: "0 auto 30px auto",
  padding: "20px",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  textAlign: "center"
};

const sessionCard = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "15px",
  marginBottom: "15px"
};

const buttonPrimary = {
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  background: "#4CAF50",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};

const buttonLogout = {
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer"
};

const cardButton = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  cursor: "pointer"
};

export default CoursePageProfessor;