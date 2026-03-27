import { db } from "../services/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";

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

  const getCourseById = async (courseId) => {
    const docRef = doc(db, "courses", courseId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Disciplina não encontrada");
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  };

  const getAllCourses = async () => {
    const snapshot = await getDocs(collection(db, "courses"));

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  return { createCourse, getCourses, getCourseById, getAllCourses };
}