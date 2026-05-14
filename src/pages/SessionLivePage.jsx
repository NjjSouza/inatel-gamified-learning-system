import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import RankingTable from "../components/RankingTable";
import TwemojiImg from "../components/TwemojiImg";
import Spinner from "../components/Spinner";
import BackButton from "../components/BackButton";

// Tempo total por questão (segundos)
const TEMPO_QUESTAO   = 40;
// Quantos segundos antes do fim aparece o toast de desfazer
const AVISO_ANTECEDENCIA = 5;

function SessionTimer({ questionIndex, onAutoAdvance, isLastQuestion }) {
  const [seconds, setSeconds]     = useState(TEMPO_QUESTAO);
  const [piscando, setPiscando]   = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  // Ref para cancelar o avanço automático
  const canceladoRef = useRef(false);
  const toastTimerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  // Reseta tudo quando a questão muda
  useEffect(() => {
    canceladoRef.current = false;
    setSeconds(TEMPO_QUESTAO);
    setPiscando(false);
    setToastVisible(false);
    clearTimeout(toastTimerRef.current);
    clearTimeout(autoAdvanceRef.current);

    const interval = setInterval(() => {
      setSeconds(s => {
        const novo = s - 1;

        // Entra na fase de aviso
        if (novo === AVISO_ANTECEDENCIA) {
          setPiscando(true);
          setToastVisible(true);

          // Agendar o avanço automático após os 5s de aviso
          autoAdvanceRef.current = setTimeout(() => {
            if (!canceladoRef.current && !isLastQuestion) {
              onAutoAdvance();
            }
            setToastVisible(false);
            setPiscando(false);
          }, AVISO_ANTECEDENCIA * 1000);
        }

        if (novo <= 0) {
          clearInterval(interval);
          return 0;
        }
        return novo;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(toastTimerRef.current);
      clearTimeout(autoAdvanceRef.current);
    };
  }, [questionIndex]);

  const handleCancelar = () => {
    canceladoRef.current = true;
    clearTimeout(autoAdvanceRef.current);
    setToastVisible(false);
    setPiscando(false);
  };

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  const emAviso   = seconds <= AVISO_ANTECEDENCIA && seconds > 0;
  const esgotado  = seconds === 0;

  return (
    <>
      {/* Timer */}
      <span style={{
        ...timerText,
        color: emAviso || esgotado ? "var(--cor-perigo)" : "var(--cor-primaria)",
        animation: piscando ? "pulse 0.6s ease-in-out infinite" : "none",
      }}>
        <TwemojiImg codepoint="23f1" size={22} alt="timer" />
        {" "}{mins}:{secs}
      </span>

      {/* Toast de desfazer */}
      {toastVisible && (
        <div style={toast}>
          <span style={toastTexto}>
            Avançando em {seconds}s…
          </span>
          <button onClick={handleCancelar} style={toastBtn}>
            Cancelar
          </button>
        </div>
      )}
    </>
  );
}

export default function SessionLivePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { finishSession, nextQuestion } = useSessions();
  const { getQuizzes, getQuestions }    = useQuizzes();

  const [session, setSession]               = useState(null);
  const [players, setPlayers]               = useState([]);
  const [quizNome, setQuizNome]             = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [respondidos, setRespondidos]       = useState(0);

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
    };
    fetch();
  }, [session?.quizId]);

  useEffect(() => {
    const q = query(collection(db, "session_players"), where("sessionId", "==", sessionId));
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    const currentIndex  = session.currentQuestionIndex ?? 0;
    const jaResponderam = players.filter(
      p => p.answers && Object.prototype.hasOwnProperty.call(p.answers, String(currentIndex))
    ).length;
    setRespondidos(jaResponderam);
  }, [players, session?.currentQuestionIndex]);

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
  const pctRespondidos = totalPlayers > 0 ? (respondidos / totalPlayers) * 100 : 0;

  return (
    <div style={container}>
      {/* Cabeçalho */}
      <div style={topBar}>
        <div>
          <p style={quizLabel}>{quizNome}</p>
          <p style={codigoLabel}>Código: <strong>{session.pin}</strong></p>
        </div>
        <BackButton />
        <div style={progressInfo}>
          {totalQuestions > 0 && (
            <SessionTimer
              questionIndex={currentIndex}
              onAutoAdvance={handleNext}
              isLastQuestion={isLastQuestion}
            />
          )}
          <span style={progressText}>
            Pergunta {currentIndex + 1} de {totalQuestions}
          </span>
        </div>
      </div>

      {/* Barra de respostas */}
      <div style={responseBar}>
        <p style={responseText}>
          {respondidos} de {totalPlayers} alunos responderam
        </p>
        <div style={barraFundo}>
          <div style={barraPreenchida(pctRespondidos)} />
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
  position: "relative", // ancora o toast
};
const quizLabel   = { fontSize: "18px", fontWeight: "bold", color: "var(--texto)", margin: "0 0 4px" };
const codigoLabel = { fontSize: "14px", color: "var(--texto-suave)", margin: 0 };
const progressInfo = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" };
const timerText = {
  fontSize: "22px", fontWeight: "bold",
  fontFamily: "'Fredoka One', sans-serif",
  display: "flex", alignItems: "center", gap: "6px",
  transition: "color 0.3s",
};
const progressText = { fontSize: "13px", color: "var(--texto-muito-suave)" };

/* Toast de desfazer - aparece abaixo do timer, ancorado à topBar */
const toast = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: "16px",
  background: "var(--bg-card)",
  border: "1px solid var(--borda)",
  borderRadius: "10px",
  boxShadow: "0 4px 16px var(--sombra)",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  zIndex: 200,
  animation: "fadeInUp 0.2s ease",
  minWidth: "220px",
};
const toastTexto = {
  fontSize: "14px", color: "var(--texto)",
  fontWeight: "600", flex: 1,
};
const toastBtn = {
  padding: "5px 12px", borderRadius: "6px",
  border: "1px solid var(--cor-perigo)",
  background: "var(--cor-perigo-claro)",
  color: "var(--cor-perigo)",
  fontWeight: "bold", fontSize: "13px",
  cursor: "pointer", whiteSpace: "nowrap",
  fontFamily: "inherit",
};

const responseBar  = { maxWidth: "700px", margin: "20px auto 0", padding: "0 20px", width: "100%" };
const responseText = { fontSize: "14px", color: "var(--texto-suave)", marginBottom: "8px", textAlign: "center" };
const barraFundo   = {
  width: "100%", height: "10px", background: "var(--borda)",
  borderRadius: "5px", overflow: "hidden",
};
const barraPreenchida = (pct) => ({
  height: "100%", borderRadius: "5px", width: `${pct}%`,
  background: "var(--cor-primaria)", transition: "width 0.4s ease",
});
const placarCard = {
  maxWidth: "700px", margin: "20px auto", padding: "20px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  width: "calc(100% - 40px)",
};
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