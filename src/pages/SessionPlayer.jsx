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

  // Quando a sessão encerrar, busca os jogadores para montar o TOP 3
  useEffect(() => {
    if (session?.status !== "finished") return;

    const key = `overlay_shown_${sessionId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "true");
      setShowFinishedOverlay(true);
    }

    const fetchFinalPlayers = async () => {
      const q = query(
        collection(db, "session_players"),
        where("sessionId", "==", sessionId)
      );
      const snap = await getDocs(q);
      const players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const top3 = [...players]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 3);
      setFinalPlayers(top3);
    };
    fetchFinalPlayers();
  }, [session?.status]);

  // Proteção: salva resposta vazia se aluno sair durante questão aberta
  useEffect(() => {
    const current = shuffledQuestions[session?.currentQuestionIndex];
    if (!current || current.tipo !== "aberta" || answered || !playerId) return;

    const salvarSeNecessario = () => {
      if (answered) return;
      submitOpenAnswer(
        playerId, sessionId, current.id,
        session.currentQuestionIndex,
        respostaAberta.trim() || "(sem resposta)",
        user?.uid, session?.classId
      ).catch(() => {});
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

  // Aviso explícito ao tentar fechar/recarregar durante questão aberta
  // O beforeunload anterior só salva silenciosamente; este exibe o diálogo nativo
  // do navegador pedindo confirmação, o que desencoraja saídas intencionais
  useEffect(() => {
    const current = shuffledQuestions[session?.currentQuestionIndex];
    const ativo = current?.tipo === "aberta" && !answered && session?.status === "playing";
    if (!ativo) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // A mensagem customizada não é exibida em navegadores modernos por segurança,
      // mas o diálogo nativo de confirmação ainda aparece.
      e.returnValue = "Você está no meio de uma questão aberta. Sair agora enviará sua resposta como está.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session?.currentQuestionIndex, session?.status, shuffledQuestions, answered]);

  // Bloqueio suave do botão Voltar do navegador
  // Se o aluno pressionar Voltar, o popstate detecta e reinjeta a entrada,
  // mantendo-o na página. Um aviso explícito é exibido na tela (não alert,
  // para não bloquear o JS) enquanto a sessão estiver ativa e sem resposta.
  const [showBackWarning, setShowBackWarning] = useState(false);

  useEffect(() => {
    const sessaoAtiva = session?.status === "playing";
    if (!sessaoAtiva) return;

    // Empurra uma entrada falsa para que o "Voltar" não leve o aluno para fora
    window.history.pushState({ inSession: true }, "");

    const handlePopState = (e) => {
      if (!answered) {
        // Reinjeta a entrada para continuar bloqueando
        window.history.pushState({ inSession: true }, "");
        // Exibe aviso não-bloqueante por 3 segundos
        setShowBackWarning(true);
        setTimeout(() => setShowBackWarning(false), 3000);
      }
      // Se já respondeu, deixa navegar normalmente (não reinjeta)
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [session?.status, answered]);

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
          <p style={{ color: "var(--texto-suave)", marginBottom: "4px", fontSize: "14px" }}>
            Seus pontos foram registrados!
          </p>
          <p style={{ color: "var(--texto-muito-suave)", marginBottom: "20px", fontSize: "13px" }}>
            XPs de questões abertas são contabilizados após correção do professor.
          </p>

          {finalPlayers.length > 0 && (
            <>
              <p style={top3Label}>Ranking Top 3</p>
              <RankingTable players={finalPlayers} highlightUserId={user?.uid} />
            </>
          )}
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
      {/* Aviso de botão Voltar */}
      {showBackWarning && (
        <div style={backWarningBanner}>
          Navegação bloqueada durante a sessão. Sua resposta será salva ao sair.
        </div>
      )}

      <div style={pageCenter}>
        {showAnswerOverlay && (
          <LottieOverlay
            src="https://lottie.host/e43f0777-f3f2-41f3-b66c-0ba87a9a1e60/Nt0MvUuGdE.lottie"
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
      {/* Aviso de botão Voltar */}
      {showBackWarning && (
        <div style={backWarningBanner}>
          Navegação bloqueada durante a sessão. Responda a questão para continuar.
        </div>
      )}

      <div style={pageCenter}>
        {showAnswerOverlay && (
          <LottieOverlay
            src="https://lottie.host/e43f0777-f3f2-41f3-b66c-0ba87a9a1e60/Nt0MvUuGdE.lottie"
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
const top3Label = {
  fontSize: "16px", fontWeight: "bold", color: "var(--texto)",
  marginBottom: "12px",
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

// Banner não-bloqueante exibido quando o aluno tenta usar o botão Voltar
const backWarningBanner = {
  position: "fixed", top: "56px", left: 0, right: 0,
  background: "var(--cor-aviso-claro)", color: "var(--cor-aviso-texto)",
  border: "none", borderBottom: "2px solid var(--cor-aviso-borda)",
  padding: "10px 20px", textAlign: "center",
  fontSize: "14px", fontWeight: "600",
  zIndex: 999, animation: "fadeIn 0.2s ease",
};