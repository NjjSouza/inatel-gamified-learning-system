import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../hooks/useCourses";
import { useNavigate } from "react-router-dom";

function DashboardProfessor() {
  const { user, logout } = useAuth();
  const { createCourse, getCourses } = useCourses();

  const navigate = useNavigate();

  const [nomeCurso, setNomeCurso] = useState("");
  const [courses, setCourses] = useState([]);

  const handleCreate = async () => {
    try {
      await createCourse(nomeCurso);
      setNomeCurso("");

      const updatedCourses = await getCourses();
      setCourses(updatedCourses);

    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      const data = await getCourses();
      setCourses(data);
    };

    fetchCourses();
  }, []);
  
  const handleSelect = (course) => {
    navigate(`/professor/curso/${course.id}`);
  };

  return (
  <div>
    <h1>Área do Professor</h1>

    <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>
        <button onClick={logout}>Sair</button>
      </div>

    <h2>Criar Disciplina</h2>

    <input
      type="text"
      placeholder="Nome da disciplina"
      value={nomeCurso}
      onChange={(e) => setNomeCurso(e.target.value)}
    />

    <button onClick={handleCreate}>
      Criar
    </button>

    <h2>Minhas Disciplinas</h2>

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

export default DashboardProfessor;