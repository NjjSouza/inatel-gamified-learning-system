import { db } from "../services/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useQuizzes() {
  const { user } = useAuth();

  const createQuiz = async (nome) => {
    const docRef = await addDoc(collection(db, "quizzes"), {
      nome,
      professorId: user.uid,
      criadoEm: new Date(),
    });

    return docRef.id;
  };

  const getQuizzes = async () => {
    const snapshot = await getDocs(collection(db, "quizzes"));

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
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

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  return { createQuiz, getQuizzes, addQuestion, getQuestions };
}