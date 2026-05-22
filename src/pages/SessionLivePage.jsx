import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
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
  const cor  = seconds >= 60 ? "var(--cor-alerta)" : "var(--cor-primaria)";

  return (
    <span style={{ ...timerText, color: cor }}>
      <TwemojiImg codepoint="23f1" size={22} alt="timer" />
      {" "}{mins}:{secs}
    </span>
  );
}

export default function SessionLivePage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const { finishSession, nextQuestion } = useSessions();
  const { getQuizzes, getQuestions }    = useQuizzes();

  const [session, setSession]               = useState(null);
  const [players, setPlayers]               = useState([]);
  const [quizNome, setQuizNome]             = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", sessionId), (snap) => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.quizId) return;
    const fetch = async () => {
      const quizzes   = await getQuizzes();
      const quiz      = quizzes.find(q => q.id === session.quizId);
      if (quiz) setQuizNome(quiz.nome);
      const questions = await getQuestions(session.quizId);
      setTotalQuestions(questions.length);
      const idx = session.currentQuestionIndex ?? 0;
      setCurrentQuestion(questions[idx] ?? null);
    };
    fetch();
  }, [session?.quizId, session?.currentQuestionIndex]);

  useEffect(() => {
    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === "finished") navigate(-1);
  }, [session?.status]);

  const handleNext = useCallback(async () => {
    const currentIndex = session?.currentQuestionIndex ?? 0;
    await nextQuestion(sessionId, currentIndex, totalQuestions);
  }, [session?.currentQuestionIndex, totalQuestions, sessionId]);

  const handleFinish = async () => {
    if (!confirm("Deseja encerrar a sessão? Esta ação não pode ser desfeita.")) return;
    await finishSession(sessionId, session.quizId);
  };

  if (!session) return <Spinner />;

  const currentIndex   = session.currentQuestionIndex ?? 0;
  const totalPlayers   = players.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  const playersComStatus = players
    .slice()
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
    .map(p => {
      const respondeu = p.answers &&
        Object.prototype.hasOwnProperty.call(p.answers, String(currentIndex));
      return { ...p, respondeu };
    });

  const respondidos    = playersComStatus.filter(p => p.respondeu).length;
  const naorespondidos = totalPlayers - respondidos;
  const pctRespondidos = totalPlayers > 0 ? (respondidos / totalPlayers) * 100 : 0;

  const isAberta = currentQuestion?.tipo === "aberta";

  return (
    <div style={container}>
      {/* Cabeçalho */}
      <div style={topBar}>
        <div>
          <p style={quizLabel}>{quizNome}</p>
          <p style={codigoLabel}>Código: <strong>{session.pin}</strong></p>
        </div>
        <div style={progressInfo}>
          {totalQuestions > 0 && (
            <SessionTimer questionIndex={currentIndex} />
          )}
          <span style={progressText}>
            Pergunta {currentIndex + 1} de {totalQuestions}
            {isAberta && <span style={badgeAberta}> aberta</span>}
          </span>
        </div>
      </div>

      {/* Barra de progresso de respostas */}
      <div style={responseBarWrap}>
        <div style={responseBarTop}>
          <span style={responseTextLeft}>
            <span style={responseNumVerde}>{respondidos}</span>
            {" "}responderam
          </span>
          <span style={responseTextRight}>
            {naorespondidos > 0
              ? <><span style={responseNumVermelho}>{naorespondidos}</span> aguardando</>
              : <span style={{ color: "var(--cor-primaria)", fontWeight: "bold" }}>Todos responderam!</span>
            }
          </span>
        </div>
        <div style={barraFundo}>
          <div style={barraPreenchida(pctRespondidos)} />
        </div>
      </div>

      {/* Lista de alunos */}
      <div style={listWrap}>
        {totalPlayers === 0 ? (
          <div style={emptyState}>
            <p style={{ color: "var(--texto-suave)", margin: 0 }}>
              Nenhum aluno entrou ainda. Compartilhe o código <strong>{session.pin}</strong>.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {playersComStatus.map(p => (
              <li
                key={p.id}
                title={p.respondeu ? `${p.nome} já respondeu` : `${p.nome} ainda não respondeu`}
                style={alunoLinha(p.respondeu)}
              >
                <span style={alunoCirculo(p.respondeu)}>
                  {(p.nome || "?").charAt(0).toUpperCase()}
                </span>
                <span style={alunoNome}>
                  {p.nome || "Aluno"}
                </span>
                <span style={alunoStatusLabel(p.respondeu)}>
                  {p.respondeu ? "Respondeu" : "… aguardando"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rodapé com ações */}
      <div style={footer}>
        <button onClick={handleFinish} style={buttonPerigo}>
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

/* Estilos */
const container = {
  minHeight: "100vh", background: "transparent",
  display: "flex", flexDirection: "column", paddingBottom: "80px",
};

const topBar = {
  background: "var(--bg-card)", padding: "16px 24px",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  boxShadow: "0 1px 4px var(--sombra)", borderBottom: "1px solid var(--borda)",
  flexWrap: "wrap", gap: "8px",
};
const quizLabel    = { fontSize: "18px", fontWeight: "bold", color: "var(--texto)", margin: "0 0 4px" };
const codigoLabel  = { fontSize: "14px", color: "var(--texto-suave)", margin: 0 };
const progressInfo = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" };
const timerText = {
  fontSize: "22px", fontWeight: "bold",
  fontFamily: "'Fredoka One', sans-serif",
  display: "flex", alignItems: "center", gap: "6px",
  transition: "color 0.5s",
};
const progressText = {
  fontSize: "13px", color: "var(--texto-muito-suave)",
  display: "flex", alignItems: "center", gap: "6px",
};
const badgeAberta = {
  fontSize: "11px", fontWeight: "bold",
  background: "var(--cor-aviso-claro)", color: "var(--cor-aviso)",
  padding: "1px 7px", borderRadius: "8px",
};

const responseBarWrap = {
  maxWidth: "700px", margin: "20px auto 0",
  padding: "0 20px", width: "100%",
};
const responseBarTop = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "8px",
};
const responseTextLeft  = { fontSize: "14px", color: "var(--texto-suave)" };
const responseTextRight = { fontSize: "14px", color: "var(--texto-suave)" };
const responseNumVerde    = { fontWeight: "bold", fontSize: "16px", color: "var(--cor-primaria)" };
const responseNumVermelho = { fontWeight: "bold", fontSize: "16px", color: "var(--cor-perigo)" };

const barraFundo = {
  width: "100%", height: "10px", background: "var(--borda)",
  borderRadius: "5px", overflow: "hidden",
};
const barraPreenchida = (pct) => ({
  height: "100%", borderRadius: "5px", width: `${pct}%`,
  background: "var(--cor-primaria)", transition: "width 0.4s ease",
});

const listWrap = {
  maxWidth: "700px", margin: "20px auto",
  padding: "0 20px", width: "100%",
};
const emptyState = {
  background: "var(--bg-card)", borderRadius: "12px",
  padding: "32px", textAlign: "center",
  border: "1px solid var(--borda)",
};

const alunoLinha = (respondeu) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 14px",
  borderRadius: "10px",
  marginBottom: "6px",
  background: respondeu ? "var(--cor-primaria-claro)" : "var(--cor-perigo-claro)",
  border: `1px solid ${respondeu ? "var(--cor-primaria-borda)" : "var(--cor-perigo-borda)"}`,
  transition: "background 0.35s ease, border-color 0.35s ease",
  animation: respondeu ? "none" : "pulse 2s ease-in-out infinite",
});

const alunoCirculo = (respondeu) => ({
  width: "34px", height: "34px", borderRadius: "50%",
  background: respondeu ? "var(--cor-primaria)" : "var(--cor-perigo)",
  color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "14px", fontWeight: "bold", flexShrink: 0,
});

const alunoNome = {
  flex: 1,
  fontSize: "14px", fontWeight: "600",
  color: "var(--texto)",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};

const alunoStatusLabel = (respondeu) => ({
  fontSize: "13px", fontWeight: "bold", flexShrink: 0,
  color: respondeu ? "var(--cor-primaria-texto)" : "var(--cor-perigo-texto)",
});

const footer = {
  position: "fixed", bottom: 0, left: 0, right: 0,
  background: "var(--bg-card)", padding: "12px 24px",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  boxShadow: "0 -1px 8px var(--sombra)", borderTop: "1px solid var(--borda)",
};
const buttonPrimary = {
  padding: "12px 24px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontSize: "15px", fontWeight: "bold",
};
const buttonPerigo = {
  padding: "12px 24px", borderRadius: "8px", border: "none",
  background: "var(--cor-perigo)", color: "#fff",
  fontSize: "15px", fontWeight: "bold", cursor: "pointer",
};