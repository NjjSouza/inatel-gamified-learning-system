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
    <div>
      <h1>{course.nome}</h1>
      <p>Professor: {professor?.nome || professor?.email}</p>

      <h2>Sessões disponíveis</h2>

      {sessions.length === 0 ? (
        <p>Nenhuma sessão ativa</p>
      ) : (
        <ul>
          {sessions.map((s) => (
            <li key={s.id}>
              PIN: {s.pin} - {s.status}

              {s.status === "playing" && (
                <button onClick={() => navigate(`/aluno/sessao/${s.id}`)}>
                  Entrar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}