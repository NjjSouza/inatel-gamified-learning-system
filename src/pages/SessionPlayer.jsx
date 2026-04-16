import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useQuizzes } from "../hooks/useQuizzes";
import { useAuth } from "../contexts/AuthContext";
import { useSessions } from "../hooks/useSessions";

export default function SessionPlayer() {
  const { user } = useAuth();
  const { sessionId } = useParams();
  const { getQuestions } = useQuizzes();
  const { submitAnswer } = useSessions();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "sessions", sessionId), (docSnap) => {
      if (docSnap.exists()) {
        setSession({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.quizId) return;

    const fetch = async () => {
      const data = await getQuestions(session.quizId);
      setQuestions(data);
    };

    fetch();
  }, [session?.quizId]);

  useEffect(() => {
    if (!user) return;

    const fetchPlayer = async () => {
      const q = query(
        collection(db, "session_players"),
        where("sessionId", "==", sessionId),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setPlayerId(snapshot.docs[0].id);
      }
    };

    fetchPlayer();
  }, [sessionId, user]);

  useEffect(() => {
    setAnswered(false);
  }, [session?.currentQuestionIndex]);

  if (!session) return <p>Carregando...</p>;

  if (session.status === "waiting") {
    return <p>Aguardando o professor...</p>;
  }

  if (session.status === "finished") {
    return <p>Quiz finalizado!</p>;
  }

  const current = questions[session.currentQuestionIndex];

  if (!current) return <p>Carregando pergunta...</p>;

  return (
    <div style={container}>
      <div style={card}>
        <h2>
          Pergunta {session.currentQuestionIndex + 1} de {questions.length}
        </h2>

        <h3 style={{ marginBottom: "20px" }}>
          {current.pergunta}
        </h3>

        <div style={answersContainer}>
          {current.alternativas.map((alt, index) => (
            <button
              key={index}
              disabled={answered}
              onClick={async () => {
                if (!playerId) return;
                
                const isCorrect = current.respostaCorreta === index;
                
                await submitAnswer(
                  playerId,
                  session.currentQuestionIndex,
                  index,
                  isCorrect
                );
                
                setAnswered(true);
              }}
              style={buttonPrimary}
            >
              {alt}
            </button>
          ))}
        </div>

        {answered && (
          <p style={{ marginTop: "15px", opacity: 0.7 }}>
            Resposta enviada!
          </p>
        )}
      </div>
    </div>
  );
}

const container = {
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const card = {
  width: "100%",
  maxWidth: "600px",
  padding: "25px",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  textAlign: "center"
};

const answersContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const buttonPrimary = {
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#4CAF50",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};