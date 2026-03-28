import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

function CoursePage() {
  const { courseId } = useParams();
  const { getCourseById } = useCourses();
  
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCourseById(courseId);
        setCourse(data);

        if (data?.professorId) {
          const docRef = doc(db, "usuarios", data.professorId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setProfessor(docSnap.data());
          }
        }

      } catch (erro) {
        alert(erro.message);
      }
    };

    fetchData();
  }, [courseId]);

  if (!course) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <button onClick={() => navigate(-1)}>
        Voltar
      </button>

      <h1>{course.nome}</h1>

      <p>
        Professor: {professor?.nome || professor?.email || "Carregando..."}
      </p>
    </div>
  );
}

export default CoursePage;