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
import TwemojiImg from "../components/TwemojiImg";

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
  const { submitAnswer, submitOpenAnswer } = useSessions();

  const [session, setSession]               = useState(null);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [shuffledAlts, setShuffledAlts]     = useState([]);
  const [playerId, setPlayerId]             = useState(null);
  const [answered, setAnswered]             = useState(false);
  const [showAnswerOverlay, setShowAnswerOverlay] = useState(false);
  const [showFinishedOverlay, setShowFinishedOverlay] = useState(false);
  const [finalPlayers, setFinalPlayers]     = useState([]);
  const [respostaAberta, setRespostaAberta] = useState("");
  const [enviandoAberta, setEnviandoAberta] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", sessionId), (snap) => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.quizId) return;
    const fetch = async () => {
      const data = await getQuestions(session.quizId);
      setShuffledQuestions(shuffleArray(data));
    };
    fetch();
  }, [session?.quizId]);

  useEffect(() => {
    const current = shuffledQuestions[session?.currentQuestionIndex];
    if (!current) return;
    if (current.tipo !== "aberta") {
      setShuffledAlts(shuffleArray(
        current.alternativas.map((alt, i) => ({ texto: alt, originalIndex: i }))
      ));
    }
    setAnswered(false);
    setRespostaAberta("");
  }, [session?.currentQuestionIndex, shuffledQuestions]);

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

  useEffect(() => {
    if (session?.status !== "finished") return;
    const key = `overlay_shown_${sessionId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "true");
      setShowFinishedOverlay(true);
    }
  }, [session?.status]);

  // Proteção: salva resposta vazia se aluno sair durante questão aberta
  // Evita erros no console e garante registro no BD
  useEffect(() => {
    const current = shuffledQuestions[session?.currentQuestionIndex];
    if (!current || current.tipo !== "aberta" || answered || !playerId) return;

    const salvarSeNecessario = () => {
      // Só age se ainda não respondeu
      if (answered) return;
      // Envia resposta em branco silenciosamente (navigator.sendBeacon não é suportado
      // pelo Firestore SDK, então usamos uma flag para evitar duplo envio)
      submitOpenAnswer(
        playerId, sessionId, current.id,
        session.currentQuestionIndex,
        respostaAberta.trim() || "(sem resposta)",
        user?.uid, session?.classId
      ).catch(() => {}); // ignora erros silenciosamente ao sair
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") salvarSeNecessario();
    };
    const handleBeforeUnload = () => salvarSeNecessario();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    session?.currentQuestionIndex,
    shuffledQuestions,
    answered,
    playerId,
    respostaAberta,
  ]);

  if (!session) return <Spinner />;

  if (session.status === "waiting") return (
    <div style={fullCenter}>
      <div style={waitingCard}>
        <DotLottieReact
          src="https://lottie.host/bd15ee68-de80-4a7f-87a4-7d16d992f416/oUWbhJDnjs.lottie"
          autoplay loop style={{ width: 200, height: 200, margin: "0 auto" }}
        />
        <p style={waitingText}>Aguardando o professor iniciar a sessão...</p>
        <p style={waitingSubtext}>Fique nesta tela. A sessão começará em breve.</p>
      </div>
    </div>
  );

  if (session.status === "finished") return (
    <div style={fullCenter}>
      {showFinishedOverlay && (
        <LottieOverlay
          src="https://lottie.host/63e7884d-4599-4223-89b0-446d20a28c9c/2hTKas29T2.lottie"
          loop={false} dark duration={3000}
          onFinish={() => setShowFinishedOverlay(false)}
        />
      )}
      {!showFinishedOverlay && (
        <div style={finishedCard}>
          <h2 style={{ color: "var(--texto)" }}>Sessão encerrada!</h2>
          <p style={{ color: "var(--texto-suave)", marginBottom: "8px", fontSize: "14px" }}>
            Seus pontos foram registrados!
          </p>
          <p style={{ color: "var(--texto-muito-suave)", marginBottom: "20px", fontSize: "13px" }}>
            XPs de questões abertas são contabilizados após correção do professor.
          </p>
          <RankingTable players={finalPlayers} highlightUserId={playerId} />
        </div>
      )}
    </div>
  );

  const current = shuffledQuestions[session.currentQuestionIndex];
  if (!current) return <Spinner />;

  const isAberta    = current.tipo === "aberta";
  const xpDaQuestao = current.xp ?? 10;

  /* Questão aberta */
  if (isAberta) return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <div style={pageCenter}>
        {showAnswerOverlay && (
          <LottieOverlay
            src="https://lottie.host/784769b9-c400-4757-ad4f-8641cbe40a1e/qUvwpO2pAd.lottie"
            loop duration={3100} onFinish={() => setShowAnswerOverlay(false)}
          />
        )}
        <div style={card}>
          <p style={questionCounter}>
            Pergunta {session.currentQuestionIndex + 1} de {shuffledQuestions.length}
          </p>
          <span style={xpTag}>
            <TwemojiImg codepoint="26a1" size={14} alt="xp" /> {xpDaQuestao} XP (aguardar correção)
          </span>
          <h3 style={questionText}>{current.pergunta}</h3>

          {answered ? (
            <div style={answeredOpenBox}>
              <p style={{ margin: 0, color: "var(--cor-primaria)", fontWeight: "bold", fontSize: "15px" }}>
                Resposta enviada! Aguarde o professor corrigir.
              </p>
            </div>
          ) : (
            <>
              <textarea
                placeholder="Digite sua resposta aqui..."
                value={respostaAberta}
                onChange={(e) => setRespostaAberta(e.target.value)}
                style={textareaStyle}
                rows={5}
                disabled={enviandoAberta}
              />
              <button
                onClick={async () => {
                  if (!respostaAberta.trim()) return alert("Digite sua resposta antes de enviar.");
                  if (!playerId) return;
                  setEnviandoAberta(true);
                  try {
                    await submitOpenAnswer(
                      playerId, sessionId, current.id,
                      session.currentQuestionIndex,
                      respostaAberta.trim(),
                      user.uid, session.classId
                    );
                    setAnswered(true);
                    setShowAnswerOverlay(true);
                  } finally {
                    setEnviandoAberta(false);
                  }
                }}
                disabled={enviandoAberta}
                style={{ ...answerButton, marginTop: "12px", opacity: enviandoAberta ? 0.7 : 1 }}
              >
                {enviandoAberta ? "Enviando..." : "Enviar resposta"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* Múltipla escolha */
  if (shuffledAlts.length === 0) return <Spinner />;

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <div style={pageCenter}>
        {showAnswerOverlay && (
          <LottieOverlay
            src="https://lottie.host/784769b9-c400-4757-ad4f-8641cbe40a1e/qUvwpO2pAd.lottie"
            loop duration={3100} onFinish={() => setShowAnswerOverlay(false)}
          />
        )}
        <div style={card}>
          <p style={questionCounter}>
            Pergunta {session.currentQuestionIndex + 1} de {shuffledQuestions.length}
          </p>
          <span style={xpTag}>
            <TwemojiImg codepoint="26a1" size={14} alt="xp" /> {xpDaQuestao} XP
          </span>
          <h3 style={questionText}>{current.pergunta}</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                    isCorrect, user.uid, session.classId, xpDaQuestao
                  );
                  setAnswered(true);
                  setShowAnswerOverlay(true);
                }}
                style={{ ...answerButton, opacity: answered ? 0.7 : 1, cursor: answered ? "default" : "pointer" }}
              >
                {alt.texto}
              </button>
            ))}
          </div>

          {answered && !showAnswerOverlay && (
            <p style={{ marginTop: "16px", fontSize: "15px", color: "var(--cor-primaria)", fontWeight: "bold" }}>
              Resposta registrada!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const fullCenter = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center", background: "transparent",
};
const pageCenter = {
  minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "center",
};
const waitingCard = {
  textAlign: "center", padding: "40px",
  background: "var(--bg-card)", borderRadius: "16px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  maxWidth: "400px", width: "90%",
};
const waitingText    = { fontSize: "18px", fontWeight: "bold", color: "var(--texto)", margin: "16px 0 8px" };
const waitingSubtext = { fontSize: "14px", color: "var(--texto-muito-suave)", margin: 0 };
const finishedCard = {
  textAlign: "center", padding: "40px",
  background: "var(--bg-card)", borderRadius: "16px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  width: "90%", maxWidth: "500px",
  animation: "fadeInUp 0.5s ease",
};
const card = {
  width: "100%", maxWidth: "600px", padding: "25px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const questionCounter = { fontSize: "13px", color: "var(--texto-muito-suave)", margin: "0 0 4px" };
const xpTag = {
  display: "inline-flex", alignItems: "center", gap: "4px",
  marginBottom: "12px", fontSize: "12px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "2px 10px", borderRadius: "10px",
};
const questionText = { fontSize: "20px", marginBottom: "24px", color: "var(--texto)" };
const answerButton = {
  padding: "14px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "15px", transition: "opacity 0.2s", cursor: "pointer",
};
const textareaStyle = {
  width: "100%", padding: "12px", borderRadius: "8px",
  border: "2px solid var(--borda)", fontSize: "15px",
  boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
  background: "var(--bg-input)", color: "var(--texto)", outline: "none",
  transition: "border-color 0.2s",
};
const answeredOpenBox = {
  background: "var(--cor-primaria-claro)", borderRadius: "10px",
  padding: "20px", marginTop: "8px",
  border: "1px solid var(--cor-primaria-borda)",
};