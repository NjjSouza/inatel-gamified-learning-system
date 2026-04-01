import { db } from "../services/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useQuizzes() {
  const { user } = useAuth();

  const createQuiz = async (courseId, nome) => {
    const docRef = await addDoc(collection(db, "quizzes"), {
      nome,
      courseId,
      professorId: user.uid,
      createdAt: new Date(),
    });

    return { id: docRef.id };
  };

  const getQuizzes = async (courseId) => {
    const q = query(
      collection(db, "quizzes"),
      where("courseId", "==", courseId)
    );

    const snapshot = await getDocs(q);

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