import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../hooks/useCourses";
import { useClasses } from "../hooks/useClasses";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function ProfileProfessor() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { getCourses } = useCourses();
  const { getClassesByCourse } = useClasses();
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const courses = await getCourses();
      const disciplinasComTurmas = await Promise.all(
        courses.map(async (course) => {
          const classes = await getClassesByCourse(course.id);
          const ativas     = classes.filter(c => c.status === "active").length;
          const encerradas = classes.filter(c => c.status === "closed").length;
          return { ...course, ativas, encerradas, total: classes.length };
        })
      );
      setDisciplinas(disciplinasComTurmas);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  return (
    <div style={container}>
      {/* Avatar + info */}
      <div style={card}>
        <div style={avatarCircle}>{user?.nome?.charAt(0).toUpperCase() || "P"}</div>
        <h2 style={{ marginTop: "15px", marginBottom: "4px", color: "var(--texto)" }}>
          {user?.nome || "Professor"}
        </h2>
        <p style={{ color: "var(--texto-muito-suave)", fontSize: "14px", margin: 0 }}>
          {user?.email}
        </p>
        <button onClick={handleLogout} style={{ ...buttonPerigo, marginTop: "20px" }}>
          Sair
        </button>
      </div>

      {/* Disciplinas */}
      <div style={card}>
        <h2>Minhas Disciplinas</h2>
        <DotLottieReact
          src="https://lottie.host/be439f2a-2a11-4425-8b5e-b82a42989f9f/8EbJ2FnIF7.lottie"
          autoplay loop
          style={{ width: 180, height: 180, margin: "0 auto" }}
        />
        {loading ? (
          <p style={{ color: "var(--texto-suave)" }}>Carregando...</p>
        ) : disciplinas.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhuma disciplina criada ainda.</p>
        ) : (
          disciplinas.map((disc) => (
            <div key={disc.id} style={discCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--texto)" }}>{disc.nome}</strong>
                <span style={{ fontSize: "13px", color: "var(--texto-muito-suave)" }}>
                  {disc.total} {disc.total === 1 ? "turma" : "turmas"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                {disc.ativas > 0 && (
                  <span style={badgeAtiva}>
                    {disc.ativas} ativa{disc.ativas > 1 ? "s" : ""}
                  </span>
                )}
                {disc.encerradas > 0 && (
                  <span style={badgeEncerrada}>
                    {disc.encerradas} encerrada{disc.encerradas > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "transparent", padding: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto 30px auto", padding: "25px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const avatarCircle = {
  width: "80px", height: "80px", borderRadius: "50%",
  background: "var(--cor-primaria)", color: "#fff", fontSize: "36px",
  fontWeight: "bold", display: "flex", alignItems: "center",
  justifyContent: "center", margin: "0 auto",
};
const discCard = {
  border: "1px solid var(--borda)", borderRadius: "10px",
  padding: "15px", marginBottom: "12px", textAlign: "left",
  background: "var(--bg-input)",
};
const badgeAtiva = {
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  fontWeight: "bold", fontSize: "12px", padding: "3px 8px", borderRadius: "12px",
};
const badgeEncerrada = {
  background: "var(--bg-hover)", color: "var(--texto-muito-suave)",
  fontWeight: "bold", fontSize: "12px", padding: "3px 8px", borderRadius: "12px",
  border: "1px solid var(--borda)",
};
const buttonPerigo = {
  padding: "8px 20px", borderRadius: "8px", border: "none",
  background: "var(--cor-perigo)", color: "#fff", cursor: "pointer", fontWeight: "bold",
};