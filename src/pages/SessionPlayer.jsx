import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function SessionPlayer() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const docRef = doc(db, "sessions", sessionId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSession({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  if (!session) return <p>Carregando...</p>;

  if (session.status === "waiting") {
    return <h1>Aguardando o professor iniciar...</h1>;
  }

  if (session.status === "playing") {
    return <h1>Jogo começou!</h1>;
  }

  if (session.status === "finished") {
    return <h1>Jogo finalizado!</h1>;
  }

  return null;
}