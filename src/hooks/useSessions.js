import { db } from "../services/firebase";
import {collection,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useSessions() {
  const { user } = useAuth();

  const createSession = async (quizId) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const docRef = await addDoc(collection(db, "sessions"), {
      professorId: user.uid,
      quizId,
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

  return {
    createSession,
    getSessionByPin,
    joinSession,
    listenPlayers,
    getSessions 
  };
}