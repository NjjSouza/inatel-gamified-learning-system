import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import RankingTable from "../components/RankingTable";
import TwemojiImg from "../components/TwemojiImg";
import Spinner from "../components/Spinner";

function SessionTimer({ questionIndex }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [questionIndex]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <span style={timerText}>
      <TwemojiImg codepoint="23f1" size={22} alt="timer" />
      {" "}{mins}:{secs}
    </span>
  );
}

export default function SessionLivePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { finishSession, nextQuestion } = useSessions();
  const { getQuizzes, getQuestions } = useQuizzes();

  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [quizNome, setQuizNome] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [respondidos, setRespondidos] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", sessionId), (snap) => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.quizId) return;
    const fetch = async () => {
      const quizzes = await getQuizzes();
      const quiz = quizzes.find(q => q.id === session.quizId);
      if (quiz) setQuizNome(quiz.nome);
      const questions = await getQuestions(session.quizId);
      setTotalQuestions(questions.length);
    };
    fetch();
  }, [session?.quizId]);

  useEffect(() => {
    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlayers(data);
    });
    return () => unsub();
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    const currentIndex = session.currentQuestionIndex ?? 0;
    const jaResponderam = players.filter(
      p => p.answers && Object.prototype.hasOwnProperty.call(
        p.answers, String(currentIndex)
      )
    ).length;
    setRespondidos(jaResponderam);
  }, [players, session?.currentQuestionIndex]);

  useEffect(() => {
    if (session?.status === "finished") navigate(-1);
  }, [session?.status]);

  if (!session) return <Spinner />;

  const currentIndex = session.currentQuestionIndex ?? 0;
  const totalPlayers = players.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  const handleNext = async () => {
    await nextQuestion(sessionId, currentIndex, totalQuestions);
  };

  const handleFinish = async () => {
    if (!confirm("Deseja encerrar a sessão? Esta ação não pode ser desfeita.")) return;
    await finishSession(sessionId, session.quizId);
  };

  return (
    <div style={container}>
      {/* Cabeçalho */}
      <div style={topBar}>
        <div>
          <p style={quizLabel}>{quizNome}</p>
          <p style={codigoLabel}>Código: <strong>{session.pin}</strong></p>
        </div>
        <div style={progressInfo}>
          <SessionTimer questionIndex={currentIndex} />
          <span style={progressText}>Pergunta {currentIndex + 1} de {totalQuestions}</span>
        </div>
      </div>

      {/* Progresso */}
      <div style={responseBar}>
        <p style={responseText}>{respondidos} de {totalPlayers} alunos responderam</p>
        <div style={progressBarFundo}>
          <div style={progressBarPreenchida(
            totalPlayers > 0 ? (respondidos / totalPlayers) * 100 : 0
          )} />
        </div>
      </div>

      {/* Placar */}
      <div style={placarCard}>
        <h2 style={{ marginBottom: "16px" }}>Placar ao vivo</h2>
        {players.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhum aluno entrou ainda.</p>
        ) : (
          <RankingTable players={players} />
        )}
      </div>

      {/* Rodapé */}
      <div style={footer}>
        <button onClick={handleFinish} style={buttonDanger}>
          Encerrar sessão
        </button>
        <button
          onClick={handleNext}
          disabled={isLastQuestion}
          style={{
            ...buttonPrimary,
            opacity: isLastQuestion ? 0.5 : 1,
            cursor: isLastQuestion ? "default" : "pointer",
          }}
        >
          Próxima pergunta
        </button>
      </div>
    </div>
  );
}

const container = {
  minHeight: "100vh", background: "var(--bg)",
  display: "flex", flexDirection: "column", paddingBottom: "80px"
};
const fullCenter = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center"
};
const topBar = {
  background: "var(--bg-card)", padding: "16px 24px",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
};
const quizLabel = { fontSize: "18px", fontWeight: "bold", color: "#222", margin: "0 0 4px", color: "var(--texto)"};
const codigoLabel = { fontSize: "14px", color: "var(--texto-suave)", margin: 0 };
const progressInfo = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" };
const timerText = {
  fontSize: "22px", fontWeight: "bold",
  color: "var(--cor-primaria)",
  fontFamily: "'Fredoka One', sans-serif",
  display: "flex", alignItems: "center", gap: "6px"
};
const progressText = { fontSize: "13px", color: "var(--texto-muito-suave)" };
const responseBar = { maxWidth: "700px", margin: "20px auto 0", padding: "0 20px", width: "100%" };
const responseText = { fontSize: "14px", color: "#555", marginBottom: "8px", textAlign: "center" };
const progressBarFundo = { width: "100%", height: "10px", background: "#e0e0e0", borderRadius: "5px", overflow: "hidden", background: "var(--borda)"};
const progressBarPreenchida = (pct) => ({
  height: "100%", borderRadius: "5px", width: `${pct}%`,
  background: "#32ae36", transition: "width 0.4s ease"
});
const placarCard = {
  maxWidth: "700px", margin: "20px auto", padding: "20px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "0 0 10px rgba(0,0,0,0.08)", width: "calc(100% - 40px)"
};
const tabela = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "10px", fontSize: "12px", color: "var(--texto-muito-suave)", borderBottom: "2px solid #eee", textAlign: "center" };
const trStyle = { borderBottom: "1px solid #f0f0f0" };
const tdStyle = { padding: "12px", fontSize: "15px", textAlign: "center" };
const footer = {
  position: "fixed", bottom: 0, left: 0, right: 0,
  background: "var(--bg-card)", padding: "12px 24px",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", boxShadow: "0 -1px 8px rgba(0,0,0,0.08)"
};
const buttonPrimary = {
  padding: "12px 24px", borderRadius: "8px", border: "none",
  background: "#32ae36", color: "#fff", fontSize: "15px", fontWeight: "bold"
};
const buttonDanger = {
  padding: "12px 24px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff", fontSize: "15px", fontWeight: "bold", cursor: "pointer"
};