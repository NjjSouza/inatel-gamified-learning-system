import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
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
    const unsubscribe = onSnapshot(
      doc(db, "sessions", sessionId),
      (docSnap) => {
        if (docSnap.exists()) {
          setSession({ id: docSnap.id, ...docSnap.data() });
        }
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.quizId) return;

    const fetchQuestions = async () => {
      const data = await getQuestions(session.quizId);
      setQuestions(data);
    };

    fetchQuestions();
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

  if (!session) return <p>Carregando sessão...</p>;

  if (session.status === "waiting") {
    return <p>Aguardando o professor iniciar...</p>;
  }

  if (session.status === "finished") {
    return (
      <div>
        <h2>Quiz finalizado!</h2>
        <p>Aguarde o professor...</p>
      </div>
    );
  }

  if (!questions.length) {
    return <p>Carregando perguntas...</p>;
  }

  if (session.currentQuestionIndex >= questions.length) {
    return (
      <div>
        <h2>Quiz finalizado!</h2>
        <p>Aguarde o professor...</p>
      </div>
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];

  if (!currentQuestion) {
    return <p>Carregando pergunta...</p>;
  }

  return (
    <div>
      <h2>
        Pergunta {session.currentQuestionIndex + 1} de {questions.length}
      </h2>

      <h3>{currentQuestion.pergunta}</h3>

      <ul>
        {currentQuestion.alternativas.map((alt, index) => (
          <li key={index}>
            <button
              disabled={answered}
              onClick={async () => {
                if (!playerId) return;

                try {
                  await submitAnswer(
                    playerId,
                    session.currentQuestionIndex,
                    index
                  );

                  setAnswered(true);
                } catch (erro) {
                  console.error(erro);
                }
              }}
            >
              {alt}
            </button>
          </li>
        ))}
      </ul>

      {answered && <p>Resposta enviada!</p>}

      <button
        disabled={answered}
        onClick={async () => {
          if (!playerId || !session) return;

          try {
            const acertou = await submitAnswer(
              playerId,
              session.currentQuestionIndex,
              index,
              session.quizId
            );

            setAnswered(true);

            if (acertou) {
              alert("Resposta correta! +10 pontos!");
            } else {
              alert("Resposta errada!");
            }
          } catch (erro) {
            console.error(erro);
          }
        }}
      >
        {alt}
      </button>
    </div>
  );
}