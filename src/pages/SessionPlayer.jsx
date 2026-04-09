import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
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
  }, [session]);

  useEffect(() => {
    setAnswered(false);
  }, [session?.currentQuestionIndex]);

  if (!session) return <p>Carregando...</p>;

  if (session.status === "waiting") return <p>Aguardando o professor...</p>;
  if (session.status === "finished") return <p>Quiz finalizado!</p>;

  const current = questions[session.currentQuestionIndex];

  if (!current) return <p>Carregando pergunta...</p>;

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>
        Pergunta {session.currentQuestionIndex + 1} de {questions.length}
      </h2>

      <h3 style={{ marginBottom: "20px" }}>{current.pergunta}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {current.alternativas.map((alt, index) => (
          <button
            key={index}
            disabled={answered}
            onClick={async () => {
              await submitAnswer(sessionId, index);
              setAnswered(true);
            }}
            style={{ padding: "10px", cursor: "pointer" }}
          >
            {alt}
          </button>
        ))}
      </div>

      {answered && <p style={{ marginTop: "15px" }}>Resposta enviada!</p>}
    </div>
  );
}