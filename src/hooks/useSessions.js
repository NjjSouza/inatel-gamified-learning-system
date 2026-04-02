import { db } from "../services/firebase";
import { collection, doc, addDoc, updateDoc, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useSessions() {
  const { user } = useAuth();

  const createSession = async (quizId, courseId) => {
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    if (!quizId || !courseId) {
      throw new Error("Dados inválidos para criar sessão");
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const docRef = await addDoc(collection(db, "sessions"), {
      professorId: user.uid,
      quizId,
      courseId,
      pin,
      status: "waiting",
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

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];

    return {
      id: doc.id,
      ...doc.data(),
    };
  };

  const joinSession = async (sessionId) => {
    if (!user) return;

    await addDoc(collection(db, "session_players"), {
      sessionId: sessionId,
      userId: user.uid,
      nome: user.nome || user.email,
      score: 0,
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

  const startSession = async (sessionId) => {
    const docRef = doc(db, "sessions", sessionId);

    await updateDoc(docRef, {
      status: "playing",
    });
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

  return {
    createSession,
    getSessionByPin,
    joinSession,
    listenPlayers,
    getSessions,
    getSessionsByCourse,
    startSession,
    listenSessionsByCourse
  };
}