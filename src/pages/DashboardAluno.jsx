import { useEffect, useState } from "react";
import { useCourses } from "../hooks/useCourses";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function DashboardAluno() {
  const { user, logout } = useAuth();
  const { getAllCourses } = useCourses();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const data = await getAllCourses();
      setCourses(data);
    };

    fetchCourses();
  }, []);

  const handleSelect = (course) => {
    navigate(`/aluno/curso/${course.id}`);
  };

  return (
    <div>
      <h1>Área do Aluno</h1>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>
        <button onClick={logout}>Sair</button>
      </div>

      <h2>Disciplinas disponíveis</h2>

      <ul>
        {courses.map((course) => (
          <li key={course.id}>
            <button onClick={() => handleSelect(course)}>
              {course.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DashboardAluno;