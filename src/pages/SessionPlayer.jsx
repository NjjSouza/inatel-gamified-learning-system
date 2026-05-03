import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useQuizzes } from "../hooks/useQuizzes";
import { useAuth } from "../contexts/AuthContext";
import { useSessions } from "../hooks/useSessions";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieOverlay from "../components/LottieOverlay";
import RankingTable from "../components/RankingTable";
import Spinner from "../components/Spinner";

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
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [shuffledAlts, setShuffledAlts] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [showAnswerOverlay, setShowAnswerOverlay] = useState(false);
  const [showFinishedOverlay, setShowFinishedOverlay] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState([]);

  // Escuta sessão em tempo real
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", sessionId), (docSnap) => {
      if (docSnap.exists()) setSession({ id: docSnap.id, ...docSnap.data() });
    });
    return () => unsub();
  }, [sessionId]);

  // Carrega e embaralha perguntas quando quiz é identificado
  useEffect(() => {
    if (!session?.quizId) return;
    const fetch = async () => {
      const data = await getQuestions(session.quizId);
      setShuffledQuestions(shuffleArray(data));
    };
    fetch();
  }, [session?.quizId]);

  // Embaralha alternativas a cada nova pergunta
  useEffect(() => {
    const current = shuffledQuestions[session?.currentQuestionIndex];
    if (!current) return;
    const altsComIndice = current.alternativas.map((alt, i) => ({
      texto: alt, originalIndex: i,
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

  // Exibe overlay de vitória ao encerrar (apenas uma vez por sessão)
  useEffect(() => {
    if (session?.status !== "finished") return;
    const key = `overlay_shown_${sessionId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "true");
      setShowFinishedOverlay(true);
    }
  }, [session?.status]);

  // Busca ranking final quando sessão encerra
  useEffect(() => {
    if (session?.status !== "finished") return;
    const fetchPlayers = async () => {
      const q = query(
        collection(db, "session_players"),
        where("sessionId", "==", sessionId)
      );
      const snap = await getDocs(q);
      setFinalPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchPlayers();
  }, [session?.status]);

  // Tela de carregamento inicial
  if (!session) return <Spinner />;

  // Tela de espera antes do professor iniciar
  if (session.status === "waiting") return (
    <div style={fullCenter}>
      <div style={waitingCard}>
        <DotLottieReact
          src="https://lottie.host/bd15ee68-de80-4a7f-87a4-7d16d992f416/oUWbhJDnjs.lottie"
          autoplay
          loop
          style={{ width: 200, height: 200, margin: "0 auto" }}
        />
        <p style={waitingText}>Aguardando o professor iniciar a sessão...</p>
        <p style={waitingSubtext}>Fique nesta tela. A sessão começará em breve.</p>
      </div>
    </div>
  );

  // Tela de encerramento com overlay de vitória e ranking final
  if (session.status === "finished") return (
    <div style={fullCenter}>
      {showFinishedOverlay && (
        <LottieOverlay
          src="https://lottie.host/63e7884d-4599-4223-89b0-446d20a28c9c/2hTKas29T2.lottie"
          loop={false}
          dark
          duration={3000}
          onFinish={() => setShowFinishedOverlay(false)}
        />
      )}
      {!showFinishedOverlay && (
        <div style={{ ...finishedCard, maxWidth: "500px" }}>
          <h2 style={finishedTitle}>Sessão encerrada!</h2>
          <p style={{ ...finishedSubtext, marginBottom: "8px" }}>
            Seus pontos foram registrados! 🎉
          </p>
          <p style={{ ...finishedSubtext, marginBottom: "20px", color: "#aaa", fontSize: "13px" }}>
            Você já pode fechar esta página ou voltar ao início.
          </p>
          <RankingTable
            players={finalPlayers}
            highlightUserId={playerId}
          />
        </div>
      )}
    </div>
  );

  const current = shuffledQuestions[session.currentQuestionIndex];
  if (!current || shuffledAlts.length === 0) return <Spinner />;

  return (
    <div className="fundo-quiz" style={{ minHeight: "100vh" }}>
      <div style={container}>
        {/* Overlay de comemoração ao responder — aparece uma vez, sem loop */}
        {showAnswerOverlay && (
          <LottieOverlay
            src="https://lottie.host/784769b9-c400-4757-ad4f-8641cbe40a1e/qUvwpO2pAd.lottie"
            loop
            duration={3100}
            onFinish={() => setShowAnswerOverlay(false)}
          />
        )}

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
                    playerId, sessionId, current.id,
                    session.currentQuestionIndex, alt.originalIndex,
                    isCorrect, user.uid, session.classId
                  );
                  setAnswered(true);
                  setShowAnswerOverlay(true);
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

          {answered && !showAnswerOverlay && (
            <p style={answeredFeedback}>Resposta registrada! 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}

const fullCenter = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center",
  background: "var(--bg)"
};
const waitingCard = {
  textAlign: "center", padding: "40px", background: "var(--bg-card)",
  borderRadius: "16px", boxShadow: "0 0 20px var(--sombra)",
  maxWidth: "400px", width: "90%"
};
const waitingText = {
  fontSize: "18px", fontWeight: "bold", color: "var(--texto)", margin: "16px 0 8px"
};
const waitingSubtext = { fontSize: "14px", color: "var(--texto-muito-suave)", margin: 0 };
const finishedCard = {
  textAlign: "center", padding: "40px", background: "var(--bg-card)",
  borderRadius: "16px", boxShadow: "0 0 20px rgba(0,0,0,0.08)",
  width: "90%", animation: "fadeInUp 0.5s ease"
};
const finishedTitle = { margin: "0 0 8px", color: "var(--texto)" };
const finishedSubtext = { fontSize: "14px", color: "var(--texto-muito-suave)", margin: 0 };
const container = {
  minHeight: "100vh",
  display: "flex", justifyContent: "center", alignItems: "center",
};
const card = {
  width: "100%", maxWidth: "600px", padding: "25px",
  background: "var(--bg-card)", borderRadius: "10px",
  boxShadow: "0 0 10px var(--sombra)", textAlign: "center"
};
const questionCounter = { fontSize: "13px", color: "var(--texto-muito-suave)", margin: "0 0 12px" };
const questionText = { fontSize: "20px", marginBottom: "24px", color: "var(--texto)" };
const answersContainer = { display: "flex", flexDirection: "column", gap: "10px" };
const answerButton = {
  padding: "14px", borderRadius: "8px", border: "none",
  background: "#32ae36", color: "#fff",
  fontWeight: "bold", fontSize: "15px", transition: "opacity 0.2s"
};
const answeredFeedback = {
  marginTop: "16px", fontSize: "15px",
  color: "#32ae36", fontWeight: "bold"
};