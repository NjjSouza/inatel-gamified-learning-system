import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import { useClasses } from "../hooks/useClasses";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

function SessionTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <p style={{ fontWeight: "bold", color: "#4CAF50" }}>
      ⏱ {mins}:{secs}
    </p>
  );
}

function CoursePageProfessor() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const { getCourseById } = useCourses();
  const { listenSessionsByCourse, createSession, startSession,
          finishSession, nextQuestion, listenPlayers } = useSessions();
  const { getQuizzes, getQuestions } = useQuizzes();
  const { createClass, getClassesByCourse, closeClass,
          enrollByEmail, getEnrollments } = useClasses();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questionsCount, setQuestionsCount] = useState({});
  const [showRanking, setShowRanking] = useState({});
  const [playersBySession, setPlayersBySession] = useState({});

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newSemestre, setNewSemestre] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollments, setEnrollments] = useState({});
  const [showEnrollments, setShowEnrollments] = useState({});

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

      const classesData = await getClassesByCourse(courseId);
      setClasses(classesData);
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
        setPlayersBySession((prev) => ({ ...prev, [s.id]: players }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [sessions]);

  const handleCreateClass = async () => {
    if (!newSemestre.trim()) return alert("Digite o semestre");
    try {
      await createClass(courseId, newSemestre.trim());
      setNewSemestre("");
      const updated = await getClassesByCourse(courseId);
      setClasses(updated);
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const handleEnroll = async (classId) => {
    if (!enrollEmail.trim()) return alert("Digite o e-mail");
    try {
      await enrollByEmail(classId, enrollEmail.trim());
      setEnrollEmail("");
      const updated = await getEnrollments(classId);
      setEnrollments(prev => ({ ...prev, [classId]: updated }));
      alert("Aluno matriculado!");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const handleShowEnrollments = async (classId) => {
    const isOpen = showEnrollments[classId];
    if (!isOpen && !enrollments[classId]) {
      const data = await getEnrollments(classId);
      setEnrollments(prev => ({ ...prev, [classId]: data }));
    }
    setShowEnrollments(prev => ({ ...prev, [classId]: !isOpen }));
  };

  const handleCreateSession = async () => {
    if (!selectedQuiz) return alert("Selecione um quiz!");
    if (!selectedClass) return alert("Selecione uma turma!");

    const session = await createSession(selectedQuiz.id, courseId, selectedClass.id);
    alert(`PIN: ${session.pin}`);
  };

  if (!course) return <p>Carregando...</p>;

  return (
    <div style={container}>
      <div style={header}>
        <h1>{course.nome}</h1>
        <p>Professor: {professor?.nome || professor?.email}</p>
      </div>

      {/* Turmas */}
      <div style={card}>
        <h2>Turmas</h2>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "15px" }}>
          <input
            placeholder="Semestre (ex: 2025/2)"
            value={newSemestre}
            onChange={(e) => setNewSemestre(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateClass} style={buttonPrimary}>
            Criar Turma
          </button>
        </div>

        {classes.length === 0 ? (
          <p>Nenhuma turma criada</p>
        ) : (
          classes.map((c) => (
            <div key={c.id} style={sessionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ textAlign: "left" }}>
                  <strong>{c.semestre}</strong>
                  <span style={{
                    marginLeft: "10px",
                    fontSize: "12px",
                    color: c.status === "active" ? "#4CAF50" : "#999"
                  }}>
                    {c.status === "active" ? "Ativa" : "Encerrada"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {c.status === "active" && (
                    <button
                      onClick={() => closeClass(c.id).then(async () => {
                        const updated = await getClassesByCourse(courseId);
                        setClasses(updated);
                      })}
                      style={buttonLogout}
                    >
                      Encerrar
                    </button>
                  )}
                  <button
                    onClick={() => handleShowEnrollments(c.id)}
                    style={buttonLogout}
                  >
                    Alunos
                  </button>
                </div>
              </div>

              {/* Matricular aluno */}
              {c.status === "active" && (
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <input
                    placeholder="E-mail do aluno"
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={() => handleEnroll(c.id)} style={buttonPrimary}>
                    Matricular
                  </button>
                </div>
              )}

              {/* Lista de alunos */}
              {showEnrollments[c.id] && (
                <ul style={{ textAlign: "left", marginTop: "10px" }}>
                  {(enrollments[c.id] || []).length === 0
                    ? <li>Nenhum aluno matriculado</li>
                    : (enrollments[c.id] || []).map(e => (
                        <li key={e.id}>{e.nome} ({e.email})</li>
                      ))
                  }
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quizzes + criar sessão */}
      <div style={card}>
        <h2>Criar Sessão</h2>

        <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Selecione o quiz:</p>
        {quizzes.map((q) => (
          <button
            key={q.id}
            onClick={() => setSelectedQuiz(prev => prev?.id === q.id ? null : q)}
            style={{ ...cardButton, background: selectedQuiz?.id === q.id ? "#ddd" : "#f9f9f9" }}
          >
            {q.nome}
          </button>
        ))}

        <p style={{ fontWeight: "bold", margin: "15px 0 5px" }}>Selecione a turma:</p>
        {classes.filter(c => c.status === "active").map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClass(prev => prev?.id === c.id ? null : c)}
            style={{ ...cardButton, background: selectedClass?.id === c.id ? "#ddd" : "#f9f9f9" }}
          >
            {c.semestre}
          </button>
        ))}

        {selectedQuiz && selectedClass && (
          <button onClick={handleCreateSession} style={{ ...buttonPrimary, marginTop: "15px" }}>
            Criar Sessão
          </button>
        )}
      </div>

      {/* Sessões */}
      <div style={card}>
        <h2>Sessões</h2>

        {sessions.length === 0 ? (
          <p>Nenhuma sessão</p>
        ) : (
          sessions.map((s) => {
            const total = questionsCount[s.quizId] || 0;
            const current = Math.min((s.currentQuestionIndex ?? 0) + 1, total);
            const turma = classes.find(c => c.id === s.classId);

            return (
              <div key={s.id} style={sessionCard}>
                <p><strong>PIN:</strong> {s.pin}</p>
                <p>Status: {s.status}</p>
                {turma && <p>Turma: <strong>{turma.semestre}</strong></p>}

                {s.status === "playing" && (
                  <>
                    <p>Pergunta {current} / {total}</p>
                    <SessionTimer key={`${s.id}-${s.currentQuestionIndex}`} />
                  </>
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
                        onClick={() => nextQuestion(s.id, s.currentQuestionIndex || 0, total)}
                        disabled={(s.currentQuestionIndex ?? 0) >= total - 1}
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
                  onClick={() => setShowRanking(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                  style={buttonLogout}
                >
                  Ranking
                </button>

                {showRanking[s.id] && playersBySession[s.id] && (
                  <ul>
                    {playersBySession[s.id]
                      .sort((a, b) => b.score - a.score)
                      .map((p, i) => (
                        <li key={p.id}>#{i + 1} {p.nome} ({p.score})</li>
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

const container = { minHeight: "100vh", background: "#f5f5f5", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "700px", margin: "0 auto 30px auto", padding: "20px",
  background: "#fff", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const sessionCard = {
  border: "1px solid #ccc", borderRadius: "10px",
  padding: "15px", marginBottom: "15px"
};
const inputStyle = {
  padding: "8px", borderRadius: "6px",
  border: "1px solid #ccc", fontSize: "14px"
};
const buttonPrimary = {
  padding: "10px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonLogout = {
  padding: "8px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer"
};
const cardButton = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid #ccc", cursor: "pointer"
};

export default CoursePageProfessor;