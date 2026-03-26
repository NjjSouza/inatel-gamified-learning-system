import { db } from "../services/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useCourses() {
  const { user } = useAuth();

  const createCourse = async (nome) => {
    if (!user) throw new Error("Usuário não autenticado");

    await addDoc(collection(db, "courses"), {
      nome: nome,
      professorId: user.uid,
      criadoEm: new Date(),
    });
  };

  const getCourses = async () => {
    if (!user) return [];

    const q = query(
      collection(db, "courses"),
      where("professorId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  return { createCourse, getCourses };
}