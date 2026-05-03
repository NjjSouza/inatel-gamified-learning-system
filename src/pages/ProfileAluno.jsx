import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useClasses } from "../hooks/useClasses";
import { useCourses } from "../hooks/useCourses";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import TwemojiImg from "../components/TwemojiImg";

function getNivel(xp) {
  if (xp <= 200) return { label: "Pedra" };
  if (xp <= 400) return { label: "Bronze" };
  if (xp <= 600) return { label: "Prata" };
  if (xp <= 800) return { label: "Ouro" };
  if (xp <= 1000) return { label: "Platina" };
  return { label: "Diamante" };
}

export default function ProfileAluno() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { getEnrolledClassIds } = useClasses();

  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const classIds = await getEnrolledClassIds(user.uid);
      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      const disciplinasMap = {};

      for (const classId of classIds) {
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (!classSnap.exists()) continue;

        const { courseId, semestre } = classSnap.data();

        if (!disciplinasMap[courseId]) {
          const courseSnap = await getDoc(doc(db, "courses", courseId));
          if (!courseSnap.exists()) continue;
          disciplinasMap[courseId] = {
            id: courseId,
            nome: courseSnap.data().nome,
            turmas: [],
          };
        }

        const xpSnap = await getDocs(query(
          collection(db, "xp"),
          where("userId", "==", user.uid),
          where("classId", "==", classId)
        ));
        const xpTurma = xpSnap.docs.reduce(
          (sum, d) => sum + (d.data().amount || 0), 0
        );

        disciplinasMap[courseId].turmas.push({
          classId,
          semestre,
          xp: xpTurma,
          nivel: getNivel(xpTurma),
        });
      }

      setDisciplinas(Object.values(disciplinasMap));
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div style={container}>
      {/* Avatar + info */}
      <div style={card}>
        <div style={avatarCircle}>
          {user?.nome?.charAt(0).toUpperCase() || "A"}
        </div>
        <h2 style={{ marginTop: "15px", marginBottom: "4px" }}>
          {user?.nome || "Aluno"}
        </h2>
        <p style={{ color: "var(--texto-muito-suave)", fontSize: "14px", margin: 0 }}>
          {user?.email}
        </p>

        <button onClick={handleLogout} style={{ ...buttonDanger, marginTop: "20px" }}>
          Sair
        </button>
      </div>

      {/* Disciplinas */}
      <div style={card}>
        <h2>Minhas Disciplinas</h2>

        <DotLottieReact
          src="https://lottie.host/be439f2a-2a11-4425-8b5e-b82a42989f9f/8EbJ2FnIF7.lottie"
          autoplay
          loop
          style={{ width: 200, height: 200, margin: "0 auto" }}
        />

        {loading ? (
          <p>Carregando...</p>
        ) : disciplinas.length === 0 ? (
          <p>Você ainda não está matriculado em nenhuma disciplina.</p>
        ) : (
          disciplinas.map((disc) => (
            <div key={disc.id} style={discCard}>
              <strong style={{ fontSize: "16px" }}>{disc.nome}</strong>

              {disc.turmas.map((t) => (
                <div key={t.classId} style={turmaRow}>
                  <span style={{ fontSize: "13px", color: "var(--texto-suave)" }}>
                    {t.semestre}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>{t.nivel.emoji}</span>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>
                      {t.nivel.label}
                    </span>
                    <span style={xpBadge}>{t.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "var(--bg)", padding: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto 30px auto", padding: "25px",
  background: "var(--bg-card)", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const avatarCircle = {
  width: "80px", height: "80px", borderRadius: "50%",
  background: "var(--cor-primaria)", color: "#fff", fontSize: "36px",
  fontWeight: "bold", display: "flex", alignItems: "center",
  justifyContent: "center", margin: "0 auto"
};
const discCard = {
  border: "1px solid #eee", borderRadius: "10px",
  padding: "15px", marginBottom: "12px", textAlign: "left"
};
const turmaRow = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginTop: "10px"
};
const xpBadge = {
  background: "#e8f5e9", color: "#32ae36", fontWeight: "bold",
  fontSize: "12px", padding: "3px 8px", borderRadius: "12px"
};
const buttonDanger = {
  padding: "8px 20px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff", cursor: "pointer", fontWeight: "bold"
};
const buttonVoltar = {
  padding: "8px 16px", borderRadius: "8px",
  border: "1px solid #ccc", background: "var(--bg-card)", cursor: "pointer"
};