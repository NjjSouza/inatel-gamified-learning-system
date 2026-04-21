import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useQuizzes } from "../hooks/useQuizzes";
import { useAuth } from "../contexts/AuthContext";
import { useSessions } from "../hooks/useSessions";

// Embaralha array sem modificar o original
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function SessionPlayer() {
  const { user } = useAuth();
  const { sessionId } = useParams();
  const { getQuestions } = useQuizzes();
  const { submitAnswer } = useSessions();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [shuffledAlts, setShuffledAlts] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [answered, setAnswered] = useState(false);

  // Escuta mudanças na sessão em tempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "sessions", sessionId), (docSnap) => {
      if (docSnap.exists()) {
        setSession({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Carrega e embaralha perguntas quando o quiz é identificado
  useEffect(() => {
    if (!session?.quizId) return;
    const fetch = async () => {
      const data = await getQuestions(session.quizId);
      setQuestions(data);
      setShuffledQuestions(shuffleArray(data));
    };
    fetch();
  }, [session?.quizId]);

  // Embaralha alternativas a cada nova pergunta
  useEffect(() => {
    const current = shuffledQuestions[session?.currentQuestionIndex];
    if (!current) return;
    const altsComIndice = current.alternativas.map((alt, i) => ({
      texto: alt,
      originalIndex: i,
    }));
    setShuffledAlts(shuffleArray(altsComIndice));
    setAnswered(false);
  }, [session?.currentQuestionIndex, shuffledQuestions]);

  // Busca o registro do jogador nesta sessão
  useEffect(() => {
    if (!user) return;
    const fetchPlayer = async () => {
      const q = query(
        collection(db, "session_players"),
        where("sessionId", "==", sessionId),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) setPlayerId(snapshot.docs[0].id);
    };
    fetchPlayer();
  }, [sessionId, user]);

  if (!session) return (
    <div style={fullCenter}>
      <div style={spinnerStyle} />
    </div>
  );

  // Tela de espera antes do professor iniciar
  if (session.status === "waiting") return (
    <div style={fullCenter}>
      <div style={waitingCard}>
        <p style={waitingEmoji}>⏳</p>
        <p style={waitingText}>Aguardando o professor iniciar a sessão...</p>
        <p style={waitingSubtext}>Fique nesta tela. A sessão começará em breve.</p>
      </div>
    </div>
  );

  // Tela de encerramento
  if (session.status === "finished") return (
    <div style={fullCenter}>
      <div style={finishedCard}>
        <p style={finishedEmoji}>🎉</p>
        <h2 style={finishedTitle}>Sessão encerrada!</h2>
        <p style={finishedSubtext}>Bom trabalho! Seus pontos foram registrados.</p>
      </div>
    </div>
  );

  const current = shuffledQuestions[session.currentQuestionIndex];
  if (!current || shuffledAlts.length === 0) return (
    <div style={fullCenter}>
      <div style={spinnerStyle} />
    </div>
  );

  return (
    <div style={container}>
      <div style={card}>
        <p style={questionCounter}>
          Pergunta {session.currentQuestionIndex + 1} de {shuffledQuestions.length}
        </p>

        <h3 style={questionText}>{current.pergunta}</h3>

        <div style={answersContainer}>
          {shuffledAlts.map((alt, index) => (
            <button
              key={index}
              disabled={answered}
              onClick={async () => {
                if (!playerId) return;
                const isCorrect = current.respostaCorreta === alt.originalIndex;
                await submitAnswer(
                  playerId,
                  sessionId,
                  current.id,
                  session.currentQuestionIndex,
                  alt.originalIndex,
                  isCorrect,
                  user.uid,
                  session.classId
                );
                setAnswered(true);
              }}
              style={{
                ...answerButton,
                opacity: answered ? 0.7 : 1,
                cursor: answered ? "default" : "pointer",
              }}
            >
              {alt.texto}
            </button>
          ))}
        </div>

        {answered && (
          <p style={answeredFeedback}>Resposta registrada! 🎉</p>
        )}
      </div>
    </div>
  );
}

const fullCenter = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center",
  background: "#f5f5f5"
};
const spinnerStyle = {
  width: "36px", height: "36px", borderRadius: "50%",
  border: "4px solid #e0e0e0", borderTop: "4px solid #4CAF50",
  animation: "spin 0.8s linear infinite"
};
const waitingCard = {
  textAlign: "center", padding: "40px",
  background: "#fff", borderRadius: "16px",
  boxShadow: "0 0 20px rgba(0,0,0,0.08)",
  maxWidth: "400px", width: "90%"
};
const waitingEmoji = {
  fontSize: "48px", margin: "0 0 16px",
  animation: "pulse 2s ease-in-out infinite"
};
const waitingText = {
  fontSize: "18px", fontWeight: "bold",
  color: "#333", margin: "0 0 8px"
};
const waitingSubtext = { fontSize: "14px", color: "#888", margin: 0 };
const finishedCard = {
  textAlign: "center", padding: "40px",
  background: "#fff", borderRadius: "16px",
  boxShadow: "0 0 20px rgba(0,0,0,0.08)",
  maxWidth: "400px", width: "90%",
  animation: "fadeInUp 0.5s ease"
};
const finishedEmoji = { fontSize: "64px", margin: "0 0 16px" };
const finishedTitle = { margin: "0 0 8px", color: "#333" };
const finishedSubtext = { fontSize: "14px", color: "#888", margin: 0 };
const container = {
  minHeight: "100vh", background: "#f5f5f5",
  display: "flex", justifyContent: "center", alignItems: "center"
};
const card = {
  width: "100%", maxWidth: "600px", padding: "25px",
  background: "#fff", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const questionCounter = {
  fontSize: "13px", color: "#888", margin: "0 0 12px"
};
const questionText = {
  fontSize: "20px", marginBottom: "24px", color: "#333"
};
const answersContainer = { display: "flex", flexDirection: "column", gap: "10px" };
const answerButton = {
  padding: "14px", borderRadius: "8px", border: "none",
  background: "#4CAF50", color: "#fff",
  fontWeight: "bold", fontSize: "15px",
  transition: "opacity 0.2s"
};
const answeredFeedback = {
  marginTop: "16px", fontSize: "15px",
  color: "#4CAF50", fontWeight: "bold"
};