import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClasses } from "../hooks/useClasses";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

function SessionTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return <p style={{ fontWeight: "bold", color: "#4CAF50" }}>⏱ {mins}:{secs}</p>;
}

export default function ClassPageProfessor() {
  const { courseId, classId } = useParams();
  const navigate = useNavigate();

  const { getEnrollments, enrollByEmail, closeClass } = useClasses();
  const { createSession, startSession, finishSession,
          nextQuestion, listenPlayers, listenSessionsByClass } = useSessions();
  const { getQuizzes, getQuestions } = useQuizzes();

  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questionsCount, setQuestionsCount] = useState({});
  const [playersBySession, setPlayersBySession] = useState({});
  const [respondidosPorSessao, setRespondidosPorSessao] = useState({});
  const [showRanking, setShowRanking] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [enrollEmail, setEnrollEmail] = useState("");
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const d = await getDoc(doc(db, "classes", classId));
      if (d.exists()) setClassData({ id: d.id, ...d.data() });

      const enrollData = await getEnrollments(classId);
      setEnrollments(enrollData);

      const quizzesData = await getQuizzes();
      setQuizzes(quizzesData);
    };
    fetch();
  }, [classId]);

  useEffect(() => {
    const unsub = listenSessionsByClass(classId, setSessions);
    return () => unsub();
  }, [classId]);

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
        setPlayersBySession(prev => ({ ...prev, [s.id]: players }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [sessions]);

  useEffect(() => {
    const unsubs = sessions
      .filter(s => s.status === "playing")
      .map((s) => {
        const q = query(
          collection(db, "session_answers"),
          where("sessionId", "==", s.id)
        );
        return onSnapshot(q, (snap) => {
          setRespondidosPorSessao(prev => ({ ...prev, [s.id]: snap.docs.length }));
        });
      });
    return () => unsubs.forEach(u => u && u());
  }, [sessions]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const sessionsSnap = await getDocs(query(
        collection(db, "sessions"),
        where("classId", "==", classId)
      ));
      const sessionIds = sessionsSnap.docs.map(d => d.id);
      if (sessionIds.length === 0) return;

      const answersSnap = await getDocs(query(
        collection(db, "session_answers"),
        where("sessionId", "in", sessionIds.slice(0, 10))
      ));

      const respostas = answersSnap.docs.map(d => d.data());
      const total = respostas.length;
      const acertos = respostas.filter(r => r.isCorrect).length;

      const errosPorQuestao = {};
      respostas.filter(r => !r.isCorrect).forEach(r => {
        errosPorQuestao[r.questionId] = (errosPorQuestao[r.questionId] || 0) + 1;
      });
      const questaoMaisErros = Object.entries(errosPorQuestao)
        .sort((a, b) => b[1] - a[1])[0];

      setAnalytics({
        totalRespostas: total,
        taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0,
        questaoMaisErros: questaoMaisErros ? questaoMaisErros[1] : 0,
        totalSessoes: sessionIds.length,
      });
    };
    fetchAnalytics();
  }, [classId, sessions]);

  const handleCreateSession = async () => {
    if (!selectedQuiz) return alert("Selecione um quiz!");
    const session = await createSession(selectedQuiz.id, courseId, classId);
    alert(`Sessão criada! PIN: ${session.pin}`);
    setSelectedQuiz(null);
  };

  const handleEnroll = async () => {
    if (!enrollEmail.trim()) return alert("Digite o e-mail");
    try {
      await enrollByEmail(classId, enrollEmail.trim());
      setEnrollEmail("");
      const updated = await getEnrollments(classId);
      setEnrollments(updated);
      alert("Aluno matriculado!");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const handleDeleteFinished = async () => {
    if (!confirm("Remover todas as sessões encerradas?")) return;
    const finished = sessions.filter(s => s.status === "finished");
    await Promise.all(finished.map(s => deleteDoc(doc(db, "sessions", s.id))));
  };

  if (!classData) return <p>Carregando...</p>;

  return (
    <div style={container}>
      <div style={header}>
        <h1>Turma {classData.semestre}</h1>
        <span style={{
          fontSize: "14px",
          color: classData.status === "active" ? "#4CAF50" : "#999"
        }}>
          {classData.status === "active" ? "Ativa" : "Encerrada"}
        </span>
      </div>

      {/* Criar sessão */}
      {classData.status === "active" && (
        <div style={card}>
          <h2>Criar Sessão</h2>
          <p style={sectionLabel}>Selecione o quiz:</p>

          {quizzes.length === 0 ? (
            <p>Nenhum quiz criado ainda.</p>
          ) : (
            quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQuiz(prev => prev?.id === q.id ? null : q)}
                style={{
                  ...cardButton,
                  background: selectedQuiz?.id === q.id ? "#ddd" : "#f9f9f9"
                }}
              >
                {q.nome}
              </button>
            ))
          )}

          {selectedQuiz && (
            <button onClick={handleCreateSession} style={{ ...buttonPrimary, marginTop: "15px" }}>
              Criar Sessão
            </button>
          )}
        </div>
      )}

      {/* Sessões */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h2 style={{ margin: 0 }}>Sessões</h2>
          {sessions.some(s => s.status === "finished") && (
            <button onClick={handleDeleteFinished} style={buttonDanger}>
              Limpar encerradas
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <p>Nenhuma sessão criada</p>
        ) : (
          sessions.map((s) => {
            const total = questionsCount[s.quizId] || 0;
            const current = Math.min((s.currentQuestionIndex ?? 0) + 1, total);
            const players = playersBySession[s.id] || [];
            const totalPlayers = players.length;
            const respondidos = respondidosPorSessao[s.id] || 0;

            return (
              <div key={s.id} style={sessionCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ margin: "0 0 4px" }}>
                      <strong>PIN:</strong> {s.pin}
                    </p>
                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#666" }}>
                      Status: {s.status}
                    </p>
                  </div>

                  {s.status === "playing" && (
                    <div style={{ textAlign: "right" }}>
                      <SessionTimer key={`${s.id}-${s.currentQuestionIndex}`} />
                      <p style={{ margin: "2px 0", fontSize: "13px" }}>
                        Pergunta {current}/{total}
                      </p>
                      <p style={{ margin: "2px 0", fontSize: "13px", color: "#555" }}>
                        ☑ {respondidos} / {totalPlayers} responderam
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
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
                      <button onClick={() => finishSession(s.id)} style={buttonSecondary}>
                        Finalizar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowRanking(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                    style={buttonSecondary}
                  >
                    {showRanking[s.id] ? "Ocultar ranking" : "Ver ranking"}
                  </button>
                </div>

                {showRanking[s.id] && players.length > 0 && (
                  <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Aluno</th>
                        <th style={thStyle}>Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...players]
                        .sort((a, b) => b.score - a.score)
                        .map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={tdStyle}>{i + 1}</td>
                            <td style={tdStyle}>{p.nome}</td>
                            <td style={tdStyle}>{p.score}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Analytics */}
      {analytics && (
        <div style={card}>
          <h2>Desempenho da Turma</h2>
          <div style={statsGrid}>
            <div style={statBox}>
              <span style={statNumber}>{analytics.totalSessoes}</span>
              <span style={statLabel}>Sessões realizadas</span>
            </div>
            <div style={statBox}>
              <span style={statNumber}>{analytics.taxaAcerto}%</span>
              <span style={statLabel}>Taxa de acerto geral</span>
            </div>
            <div style={statBox}>
              <span style={statNumber}>{analytics.totalRespostas}</span>
              <span style={statLabel}>Respostas registradas</span>
            </div>
            <div style={statBox}>
              <span style={statNumber}>{analytics.questaoMaisErros}</span>
              <span style={statLabel}>Erros na questão mais difícil</span>
            </div>
          </div>
        </div>
      )}

      {/* Alunos matriculados */}
      <div style={card}>
        <h2>Alunos Matriculados</h2>

        {classData.status === "active" && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", justifyContent: "center" }}>
            <input
              placeholder="E-mail do aluno"
              value={enrollEmail}
              onChange={(e) => setEnrollEmail(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleEnroll} style={buttonPrimary}>
              Matricular
            </button>
          </div>
        )}

        {enrollments.length === 0 ? (
          <p>Nenhum aluno matriculado</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={tdStyle}>{e.nome || "—"}</td>
                  <td style={tdStyle}>{e.email}</td>
                  <td style={tdStyle}>
                    <span style={{ color: e.userId ? "#4CAF50" : "#aaa", fontSize: "12px" }}>
                      {e.userId ? "Cadastrado" : "Aguardando cadastro"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {classData.status === "active" && (
          <button
            onClick={() => closeClass(classId).then(() =>
              setClassData(prev => ({ ...prev, status: "closed" }))
            )}
            style={{ ...buttonDanger, marginTop: "20px" }}
          >
            Encerrar Turma
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <button onClick={() => navigate(`/professor/curso/${courseId}`)} style={buttonSecondary}>
          ← Voltar para a disciplina
        </button>
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
const sectionLabel = { fontWeight: "bold", textAlign: "left", marginBottom: "8px" };
const sessionCard = {
  border: "1px solid #ccc", borderRadius: "10px",
  padding: "15px", marginBottom: "15px", textAlign: "left"
};
const statsGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" };
const statBox = {
  background: "#f5f5f5", borderRadius: "10px", padding: "20px 10px",
  display: "flex", flexDirection: "column", alignItems: "center", gap: "6px"
};
const statNumber = { fontSize: "28px", fontWeight: "bold", color: "#4CAF50" };
const statLabel = { fontSize: "13px", color: "#666" };
const inputStyle = {
  padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", flex: 1
};
const buttonPrimary = {
  padding: "10px 15px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonSecondary = {
  padding: "8px 12px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer"
};
const buttonDanger = {
  padding: "8px 12px", borderRadius: "8px", border: "none",
  background: "#f44336", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const cardButton = {
  width: "100%", padding: "10px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid #ccc", cursor: "pointer"
};
const thStyle = { padding: "8px", fontSize: "12px", color: "#888", borderBottom: "2px solid #eee" };
const tdStyle = { padding: "10px", fontSize: "14px", textAlign: "center" };