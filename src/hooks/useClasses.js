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

const enrollByMatricula = async (classId, matricula, nomeHint = "") => {
  if (!matricula) throw new Error("Matrícula inválida");

  const existing = await getDocs(query(
    collection(db, "enrollments"),
    where("classId", "==", classId),
    where("matricula", "==", matricula)
  ));
  if (!existing.empty) throw new Error("Aluno já matriculado nesta turma");

  const userSnap = await getDocs(query(
    collection(db, "usuarios"),
    where("matricula", "==", matricula)
  ));

  if (!userSnap.empty) {
    const alunoDoc = userSnap.docs[0];
    if (alunoDoc.data().tipo !== "aluno") {
      throw new Error("Esse usuário não é um aluno");
    }
    await addDoc(collection(db, "enrollments"), {
      classId,
      matricula,
      email: alunoDoc.data().email || "",
      userId: alunoDoc.id,
      
      nome: alunoDoc.data().nome || nomeHint || "",
      enrolledAt: new Date(),
    });
  } else {
    await addDoc(collection(db, "enrollments"), {
      classId,
      matricula,
      email: "",
      userId: null,
      nome: nomeHint || "",
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

  const linkEnrollments = async (userId, matricula, nome) => {
    const q = query(
      collection(db, "enrollments"),
      where("matricula", "==", matricula),
      where("userId", "==", null)
    );
    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map((d) =>
      updateDoc(doc(db, "enrollments", d.id), {
        userId,
      })
    );
    await Promise.all(updates);
  };

  return {
    createClass,
    getClassesByCourse,
    closeClass,
    enrollByMatricula,
    getEnrollments,
    getEnrolledClassIds,
    linkEnrollments,
  };
}