import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { useClasses } from "../hooks/useClasses";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { getNivel, NIVEIS } from "../utils/niveis";
import NivelIcon from "../components/NivelIcon";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";

const XP_MAX_POR_TURMA = 1000;

function XpBar({ xp, nivel }) {
  const pct = Math.min((xp / XP_MAX_POR_TURMA) * 100, 100);

  const nivelAtualIdx = NIVEIS.findIndex(n => n.label === nivel.label);
  const proximo = NIVEIS[nivelAtualIdx + 1] ?? null;

  const cores = {
    Pedra:    "#888780",
    Bronze:   "#d6462f",
    Prata:    "#dbdad4",
    Ouro:     "#efd700",
    Diamante: "#55aac9",
  };
  const cor = cores[nivel.label] ?? "#639922";

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={xpBarRow}>
        <span style={{ fontSize: "12px", color: "var(--texto)" }}>{xp} XP</span>
        <span style={{ fontSize: "11px", color: "var(--texto-muito-suave)" }}>
          {proximo ? `${proximo.min - xp} para ${proximo.label}` : "nível máximo!"}
        </span>
      </div>
      <div style={xpBarBg}>
        <div style={{ ...xpBarFill, width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

function DashboardAluno() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getEnrolledClassIds } = useClasses();

  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xpTotal, setXpTotal] = useState(0);

  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!user) return;
      const classIds = await getEnrolledClassIds(user.uid);
      const cursosMap = {};

      let somaXpTotal = 0;

      for (const classId of classIds) {
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (!classSnap.exists()) continue;
        const { courseId } = classSnap.data();

        const xpSnap = await getDocs(query(
          collection(db, "xp"),
          where("userId", "==", user.uid),
          where("classId", "==", classId)
        ));
        const xpTurma = xpSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
        somaXpTotal += xpTurma;

        if (!cursosMap[courseId]) {
          const courseSnap = await getDoc(doc(db, "courses", courseId));
          if (!courseSnap.exists()) continue;
          cursosMap[courseId] = {
            id: courseId,
            ...courseSnap.data(),
            xp: 0,
            classId,
          };
        }
        // Acumula XP no curso (pode ter mais de uma turma; usa o maior)
        if (xpTurma > cursosMap[courseId].xp) {
          cursosMap[courseId].xp = xpTurma;
          cursosMap[courseId].classId = classId;
        }
      }

      setXpTotal(somaXpTotal);
      setDisciplinas(Object.values(cursosMap));
      setLoading(false);
    };
    fetchDisciplinas();
  }, [user]);

  if (loading) return <Spinner />;

  const nivelGeral = getNivel(xpTotal);

  return (
    <div style={container}>

      {/* Hero de boas-vindas */}
      <div style={heroCard}>
        <div style={heroTop}>
          <div style={avatarCircle}>{user?.nome?.charAt(0).toUpperCase() || "A"}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "var(--texto)" }}>
              Olá, {user?.nome?.split(" ")[0] || "Aluno"}!
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--texto-suave)" }}>
              Bem-vindo de volta
            </p>
          </div>
        </div>

        <div style={statsRow}>
          <div style={statBox}>
            <span style={{ ...statVal, color: "var(--cor-primaria)" }}>{xpTotal}</span>
            <span style={statLbl}>XP total</span>
          </div>
          <div style={statBox}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
              {nivelGeral.label !== "-" && (
                <NivelIcon nivel={nivelGeral.label} size={22} />
              )}
              <span style={{ ...statVal, fontSize: "15px" }}>
                {nivelGeral.label !== "-" ? nivelGeral.label : "-"}
              </span>
            </div>
            <span style={statLbl}>nível atual</span>
          </div>
          <div style={statBox}>
            <span style={statVal}>{disciplinas.length}</span>
            <span style={statLbl}>disciplina{disciplinas.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Cards de disciplinas */}
      <div style={card}>
        <h2 style={{ marginBottom: "16px" }}>Minhas Disciplinas</h2>

        {disciplinas.length === 0 ? (
          <EmptyState
            icon="book"
            variante="inatel"
            titulo="Nenhuma disciplina ainda"
            mensagem="Seu professor precisa te matricular em uma turma. Passe seu nome e matrícula a ele, ou aguarde a confirmação do cadastro."
          />
        ) : (
          disciplinas.map((curso) => {
            const nivel = getNivel(curso.xp);
            return (
              <button
                key={curso.id}
                onClick={() => navigate(`/aluno/curso/${curso.id}`)}
                style={discCard}
              >
                <div style={discTop}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "600", fontSize: "15px", color: "var(--texto)" }}>
                      {curso.nome}
                    </div>
                  </div>
                  {nivel.label !== "-" && (
                    <span style={nivelPill}>
                      <NivelIcon nivel={nivel.label} size={16} />
                      {nivel.label}
                    </span>
                  )}
                </div>
                <XpBar xp={curso.xp} nivel={nivel} />
              </button>
            );
          })
        )}
      </div>

      {/* Entrar em sessão */}
      <div style={enterCard}>
        <div>
          <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--texto)" }}>
            Entrar em uma sessão
          </div>
          <div style={{ fontSize: "13px", color: "var(--texto-suave)", marginTop: "2px" }}>
            Use o código fornecido pelo professor
          </div>
        </div>
        <button onClick={() => navigate("/entrar")} style={buttonPrimary}>
          Entrar com código
        </button>
      </div>
    </div>
  );
}

/* Estilos */
const container = { minHeight: "100vh", background: "transparent", padding: "24px 20px" };

const heroCard = {
  maxWidth: "600px", margin: "0 auto 20px auto",
  padding: "20px",
  background: "var(--bg-card)", borderRadius: "14px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
};
const heroTop = {
  display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px",
};
const avatarCircle = {
  width: "52px", height: "52px", borderRadius: "50%",
  background: "var(--cor-primaria)", color: "#fff",
  fontSize: "22px", fontWeight: "bold",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};
const statsRow = {
  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px",
};
const statBox = {
  background: "var(--bg-input)", borderRadius: "10px",
  padding: "12px 8px", textAlign: "center",
  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
};
const statVal = { fontSize: "22px", fontWeight: "bold", lineHeight: 1, color: "var(--texto)" };
const statLbl = { fontSize: "11px", color: "var(--texto-suave)", marginTop: "2px" };

const card = {
  maxWidth: "600px", margin: "0 auto 16px auto", padding: "20px 20px 12px",
  background: "var(--bg-card)", borderRadius: "14px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const discCard = {
  width: "100%", marginBottom: "10px",
  padding: "14px 16px", borderRadius: "10px",
  border: "1px solid var(--borda)",
  background: "var(--bg-input)", cursor: "pointer",
  textAlign: "left", transition: "border-color 0.15s",
  display: "block",
};
const discTop = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
};
const nivelPill = {
  display: "inline-flex", alignItems: "center", gap: "5px",
  fontSize: "12px", fontWeight: "600",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "3px 10px", borderRadius: "20px", flexShrink: 0,
};
const xpBarRow = {
  display: "flex", justifyContent: "space-between", marginBottom: "4px",
};
const xpBarBg = {
  height: "7px", background: "var(--borda)", borderRadius: "4px", overflow: "hidden",
};
const xpBarFill = {
  height: "100%", borderRadius: "4px", transition: "width 0.5s ease",
};
const enterCard = {
  maxWidth: "600px", margin: "0 auto",
  padding: "16px 20px",
  background: "var(--bg-card)", borderRadius: "14px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
};
const buttonPrimary = {
  padding: "10px 18px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  cursor: "pointer", fontWeight: "bold", fontSize: "14px", flexShrink: 0,
};

export default DashboardAluno;