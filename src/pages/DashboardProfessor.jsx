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

  useEffect(() => {
    const fetchCourses = async () => {
      const data = await getCourses();
      setCourses(data);
    };

    fetchCourses();
  }, []);

  const handleCreate = async () => {
    if (!nomeCurso) return;

    try {
      await createCourse(nomeCurso);
      setNomeCurso("");

      const updatedCourses = await getCourses();
      setCourses(updatedCourses);
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <h1>Área do Professor</h1>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>

        <button onClick={logout} style={buttonLogout}>
          Sair
        </button>
      </div>

      <div style={card}>
        <h2>Criar Disciplina</h2>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <input
            type="text"
            placeholder="Nome da disciplina"
            value={nomeCurso}
            onChange={(e) => setNomeCurso(e.target.value)}
            style={inputStyle}
          />

          <button onClick={handleCreate} style={buttonPrimary}>
            Criar
          </button>
        </div>
      </div>

      <div style={card}>
        <h2>Minhas Disciplinas</h2>

        {courses.length === 0 ? (
          <p>Nenhuma disciplina criada</p>
        ) : (
          <div style={{ marginTop: "15px" }}>
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() =>
                  navigate(`/professor/curso/${course.id}`)
                }
                style={cardButton}
              >
                {course.nome}
              </button>
            ))}
          </div>
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
  margin: "0 auto 30px auto",
  padding: "20px",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  textAlign: "center"
};

const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  width: "60%"
};

const buttonPrimary = {
  padding: "10px 15px",
  borderRadius: "8px",
  border: "none",
  background: "#4CAF50",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const buttonLogout = {
  marginTop: "10px",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: "bold"
};

const cardButton = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#f9f9f9",
  cursor: "pointer"
};

export default DashboardProfessor;