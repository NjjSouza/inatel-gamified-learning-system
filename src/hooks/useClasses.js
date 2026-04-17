import { db } from "../services/firebase";
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

export function useClasses() {
  const { user } = useAuth();

  const createClass = async (courseId, semestre) => {
    if (!user) throw new Error("Não autenticado");

    const docRef = await addDoc(collection(db, "classes"), {
      courseId,
      professorId: user.uid,
      semestre,
      status: "active",
      createdAt: new Date(),
    });

    return { id: docRef.id };
  };

  const getClassesByCourse = async (courseId) => {
    const q = query(
      collection(db, "classes"),
      where("courseId", "==", courseId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const closeClass = async (classId) => {
    await updateDoc(doc(db, "classes", classId), {
      status: "closed",
    });
  };

  const enrollByEmail = async (classId, email) => {
    if (!email) throw new Error("E-mail inválido");

    const existing = await getDocs(query(
      collection(db, "enrollments"),
      where("classId", "==", classId),
      where("email", "==", email.toLowerCase())
    ));
    if (!existing.empty) throw new Error("E-mail já matriculado nesta turma");

    const userSnap = await getDocs(query(
      collection(db, "usuarios"),
      where("email", "==", email.toLowerCase())
    ));

    if (!userSnap.empty) {
      const alunoDoc = userSnap.docs[0];
      if (alunoDoc.data().tipo !== "aluno") {
        throw new Error("Esse usuário não é um aluno");
      }
      await addDoc(collection(db, "enrollments"), {
        classId,
        email: email.toLowerCase(),
        userId: alunoDoc.id,
        nome: alunoDoc.data().nome || "",
        enrolledAt: new Date(),
      });
    } else {
      await addDoc(collection(db, "enrollments"), {
        classId,
        email: email.toLowerCase(),
        userId: null,
        nome: "",
        enrolledAt: new Date(),
      });
    }
  };

  const getEnrollments = async (classId) => {
    const q = query(
      collection(db, "enrollments"),
      where("classId", "==", classId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const getEnrolledClassIds = async (userId) => {
    const q = query(
      collection(db, "enrollments"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data().classId);
  };

  const linkEnrollments = async (userId, email, nome) => {
    const q = query(
      collection(db, "enrollments"),
      where("email", "==", email.toLowerCase()),
      where("userId", "==", null)
    );
    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map((d) =>
      updateDoc(doc(db, "enrollments", d.id), {
        userId,
        nome: nome || "",
      })
    );
    await Promise.all(updates);
  };

  return {
    createClass,
    getClassesByCourse,
    closeClass,
    enrollByEmail,
    getEnrollments,
    getEnrolledClassIds,
    linkEnrollments,
  };
}