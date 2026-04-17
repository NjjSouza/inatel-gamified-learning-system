import { db } from "../services/firebase";
import { collection, doc, addDoc, updateDoc, query, where, onSnapshot, getDocs, increment } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useQuizzes } from "./useQuizzes";

export function useSessions() {
  const { user } = useAuth();
  const { getQuestions } = useQuizzes(); 

  const createSession = async (quizId, courseId, classId) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!quizId || !courseId || !classId) throw new Error("Dados inválidos");

    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const docRef = await addDoc(collection(db, "sessions"), {
      professorId: user.uid,
      quizId,
      courseId,
      classId,
      pin,
      status: "waiting",
      currentQuestionIndex: 0,
      createdAt: new Date(),
    });

    return { id: docRef.id, pin };
  };

  const getSessionByPin = async (pin) => {
    const q = query(
      collection(db, "sessions"),
      where("pin", "==", pin)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];

    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  };

  const joinSession = async (sessionId) => {
    if (!user) return;

    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId),
      where("userId", "==", user.uid)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;

    await addDoc(collection(db, "session_players"), {
      sessionId,
      userId: user.uid,
      nome: user.nome || user.email,
      score: 0,
      answers: {},
    });
  };

  const listenPlayers = (sessionId, callback) => {
    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId)
    );

    return onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(players);
    });
  };

  const getSessions = async () => {
    if (!user) return [];

    const q = query(
      collection(db, "sessions"),
      where("professorId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  const getSessionsByCourse = async (courseId) => {
    const q = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  const listenSessionsByCourse = (courseId, callback) => {
    const q = query(
      collection(db, "sessions"),
      where("courseId", "==", courseId)
    );

    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(sessions);
    });
  };

  const startSession = async (sessionId) => {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "playing",
      currentQuestionIndex: 0,
    });
  };

  const finishSession = async (sessionId) => {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "finished",
    });
  };

  const nextQuestion = async (sessionId, currentIndex, totalQuestions) => {
    if (currentIndex + 1 >= totalQuestions) {
      console.warn("Última pergunta atingida");
      return;
    }

    await updateDoc(doc(db, "sessions", sessionId), {
      currentQuestionIndex: currentIndex + 1,
    });
  };

  const submitAnswer = async (playerId, questionIndex, answerIndex, isCorrect) => {
    if (!playerId) return false;

    const playerRef = doc(db, "session_players", playerId);

    await updateDoc(playerRef, {
      [`answers.${questionIndex}`]: answerIndex,
      score: isCorrect ? increment(10) : increment(0),
    });

    return isCorrect;
  };

  return {
    createSession,
    getSessionByPin,
    joinSession,
    listenPlayers,
    getSessions,
    getSessionsByCourse,
    listenSessionsByCourse,
    startSession,
    finishSession,
    nextQuestion,
    submitAnswer,
  };
}