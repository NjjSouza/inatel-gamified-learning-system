import { db } from "../services/firebase";
import { collection, doc, addDoc, getDocs, deleteDoc, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useQuizzes() {
  const { user } = useAuth();

  const createQuiz = async (nome) => {
    const docRef = await addDoc(collection(db, "quizzes"), {
      nome,
      professorId: user.uid,
      createdAt: new Date(),
    });
    return { id: docRef.id };
  };

  const getQuizzes = async () => {
    if (!user) return [];
    const q = query(
      collection(db, "quizzes"),
      where("professorId", "==", user.uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const addQuestion = async (quizId, question) => {
    await addDoc(
      collection(db, "quizzes", quizId, "questions"),
      question
    );
  };

  const getQuestions = async (quizId) => {
    const snapshot = await getDocs(
      collection(db, "quizzes", quizId, "questions")
    );
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const deleteQuiz = async (quizId) => {
    await deleteDoc(doc(db, "quizzes", quizId));
  };

  return { createQuiz, getQuizzes, addQuestion, getQuestions, deleteQuiz };
}