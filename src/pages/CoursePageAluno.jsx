import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCourses } from "../hooks/useCourses";
import { useClasses } from "../hooks/useClasses";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function CoursePageAluno() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { getCourseById } = useCourses();
  const { getEnrolledClassIds } = useClasses();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [stats, setStats] = useState({
    totalSessoes: 0,
    totalRespostas: 0,
    totalAcertos: 0,
    totalXP: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const data = await getCourseById(courseId);
      setCourse(data);

      if (data?.professorId) {
        const profSnap = await getDoc(doc(db, "usuarios", data.professorId));
        if (profSnap.exists()) setProfessor(profSnap.data());
      }

      const enrolledClassIds = await getEnrolledClassIds(user.uid);

      const classesSnap = await getDocs(query(
        collection(db, "classes"),
        where("courseId", "==", courseId)
      ));

      const classIds = classesSnap.docs
        .map(d => d.id)
        .filter(id => enrolledClassIds.includes(id));

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      const sessionsSnap = await getDocs(query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      ));

      const sessionIds = sessionsSnap.docs
        .filter(d => classIds.includes(d.data().classId))
        .map(d => d.id);

      if (sessionIds.length === 0) {
        setLoading(false);
        return;
      }

      const answersSnap = await getDocs(query(
        collection(db, "session_answers"),
        where("userId", "==", user.uid)
      ));

      const respostas = answersSnap.docs
        .map(d => d.data())
        .filter(r => sessionIds.includes(r.sessionId));

      const sessõesParticipadas = new Set(respostas.map(r => r.sessionId)).size;
      const acertos = respostas.filter(r => r.isCorrect).length;

      const xpSnap = await getDocs(query(
        collection(db, "xp"),
        where("userId", "==", user.uid),
        where("classId", "in", classIds)
      ));
      const totalXP = xpSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

      setStats({
        totalSessoes: sessõesParticipadas,
        totalRespostas: respostas.length,
        totalAcertos: acertos,
        totalXP,
      });

      setLoading(false);
    };

    fetchData();
  }, [courseId, user]);

  if (!course) return <p>Carregando...</p>;

  const precisao = stats.totalRespostas > 0
    ? Math.round((stats.totalAcertos / stats.totalRespostas) * 100)
    : 0;

  return (
    <div style={container}>
      <div style={header}>
        <h1>{course.nome}</h1>
        <p>Professor: {professor?.nome || professor?.email}</p>
      </div>

      <div style={card}>
        <h2>Meu Desempenho</h2>

        {loading ? (
          <p> </p>
        ) : stats.totalRespostas === 0 ? (
          <p>Você ainda não participou de nenhuma sessão nesta disciplina.</p>
        ) : (
          <div style={statsGrid}>
            <div style={statBox}>
              <span style={statNumber}>{stats.totalXP}</span>
              <span style={statLabel}>XP Total</span>
            </div>
            <div style={statBox}>
              <span style={statNumber}>{stats.totalSessoes}</span>
              <span style={statLabel}>Quizzes Respondidos</span>
            </div>
            <div style={statBox}>
              <span style={statNumber}>{stats.totalAcertos}</span>
              <span style={statLabel}>Acertos</span>
            </div>
            <div style={statBox}>
              <span style={statNumber}>{precisao}%</span>
              <span style={statLabel}>Precisão</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "#f5f5f5", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto", padding: "20px",
  background: "#fff", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "15px",
  marginTop: "15px"
};
const statBox = {
  background: "#f5f5f5",
  borderRadius: "10px",
  padding: "20px 10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px"
};
const statNumber = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#4CAF50"
};
const statLabel = {
  fontSize: "13px",
  color: "#666"
};
const buttonVoltar = {
  padding: "8px 16px", borderRadius: "8px",
  border: "1px solid #ccc", background: "#fff", cursor: "pointer"
};