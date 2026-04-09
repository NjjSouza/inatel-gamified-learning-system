import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCourses } from "../hooks/useCourses";
import { useSessions } from "../hooks/useSessions";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function CoursePageAluno() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const { getCourseById } = useCourses();
  const { listenSessionsByCourse } = useSessions();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await getCourseById(courseId);
      setCourse(data);

      if (data?.professorId) {
        const docRef = doc(db, "usuarios", data.professorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setProfessor(docSnap.data());
      }
    };

    fetch();
  }, [courseId]);

  useEffect(() => {
    const unsubscribe = listenSessionsByCourse(courseId, setSessions);
    return () => unsubscribe();
  }, [courseId]);

  if (!course) return <p>Carregando...</p>;

  return (
    <div style={container}>
      <div style={header}>
        <h1>{course.nome}</h1>
        <p>Professor: {professor?.nome || professor?.email}</p>
      </div>

      <div style={card}>
        <h2>Sessões disponíveis</h2>

        {sessions.length === 0 ? (
          <p>Nenhuma sessão ativa</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} style={sessionCard}>
              <p><strong>PIN:</strong> {s.pin}</p>
              <p>Status: {s.status}</p>

              {s.status === "playing" && (
                <button
                  onClick={() => navigate(`/aluno/sessao/${s.id}`)}
                  style={buttonPrimary}
                >
                  Entrar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const container = {
  minHeight: "100vh",
  background: "#f5f5f5",
  padding: "30px"
};

const header = {
  textAlign: "center",
  marginBottom: "30px"
};

const card = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  textAlign: "center"
};

const sessionCard = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "15px",
  marginBottom: "10px"
};

const buttonPrimary = {
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  background: "#4CAF50",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};