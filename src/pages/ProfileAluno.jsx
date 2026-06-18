import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useClasses } from "../hooks/useClasses";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import NivelIcon from "../components/NivelIcon";
import { getNivel } from "../utils/niveis";
import EmptyState from "../components/EmptyState";

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
      if (!classIds.length) { setLoading(false); return; }

      const disciplinasMap = {};
      for (const classId of classIds) {
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (!classSnap.exists()) continue;
        const { courseId, semestre } = classSnap.data();

        if (!disciplinasMap[courseId]) {
          const courseSnap = await getDoc(doc(db, "courses", courseId));
          if (!courseSnap.exists()) continue;
          disciplinasMap[courseId] = { id: courseId, nome: courseSnap.data().nome, turmas: [] };
        }

        const xpSnap = await getDocs(query(
          collection(db, "xp"),
          where("userId", "==", user.uid),
          where("classId", "==", classId)
        ));
        const xpTurma = xpSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const nivel = getNivel(xpTurma);
        disciplinasMap[courseId].turmas.push({ classId, semestre, xp: xpTurma, nivel });
      }
      setDisciplinas(Object.values(disciplinasMap));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  return (
    <div style={container}>
      <div style={card}>
        <div style={avatarCircle}>{user?.nome?.charAt(0).toUpperCase() || "A"}</div>
        <h2 style={{ marginTop: "15px", marginBottom: "4px", color: "var(--texto)" }}>
          {user?.nome || "Aluno"}
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
          <p style={{ color: "var(--texto-suave)" }}>Você ainda não está matriculado em nenhuma disciplina.</p>
        ) : (
          disciplinas.map((disc) => (
            <div key={disc.id} style={discCard}>
              <strong style={{ fontSize: "15px", color: "var(--texto)" }}>{disc.nome}</strong>
              {disc.turmas.map((t) => {
                const semNivel = t.nivel.label === "-";
                return (
                  <div key={t.classId} style={turmaRow}>
                    <span style={{ fontSize: "13px", color: "var(--texto-suave)" }}>{t.semestre}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {!semNivel && t.nivel.codepoint && (
                        <NivelIcon nivel={t.nivel.label} size={24} />
                      )}
                      <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--texto-suave)" }}>
                        {semNivel ? "-" : t.nivel.label}
                      </span>
                      <span style={xpBadge}>{t.xp} XP</span>
                    </div>
                  </div>
                );
              })}
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
const turmaRow = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginTop: "10px",
};
const xpBadge = {
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  fontWeight: "bold", fontSize: "12px", padding: "3px 8px", borderRadius: "12px",
};
const buttonPerigo = {
  padding: "8px 20px", borderRadius: "8px", border: "none",
  background: "var(--cor-perigo)", color: "#fff", cursor: "pointer", fontWeight: "bold",
};