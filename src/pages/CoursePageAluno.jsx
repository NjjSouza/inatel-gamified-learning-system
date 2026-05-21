import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCourses } from "../hooks/useCourses";
import { useClasses } from "../hooks/useClasses";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import Spinner from "../components/Spinner";
import BackButton from "../components/BackButton";
import RankingTable from "../components/RankingTable";
import TwemojiImg from "../components/TwemojiImg";
import { getNivel } from "../utils/niveis";

const NIVEL_CODEPOINTS = {
  "Pedra":    "1faa8",
  "Bronze":   "1f949",
  "Prata":    "1f948",
  "Ouro":     "1f947",
  "Diamante": "1f48e",
};

/**
 * Agrupa entradas do histórico de XP por sessão para múltipla escolha,
 * mantendo presença e questões abertas como entradas individuais.
 
 * xpMaxPorSessao: { [sessionId]: number } - XP máximo possível de questões
 * fechadas naquela sessão (para exibir a fração correta no histórico).
 
 * xpMaxPorResposta: { [answerId]: number } - XP máximo de cada questão aberta
 * (para exibir "7/10 XP" em vez de só "7 XP").
 */
function agruparHistoricoXp(entries, xpMaxPorSessao = {}, xpMaxPorResposta = {}) {
  const resultado = [];
  const multipla  = {};

  for (const e of entries) {
    if (e.reason === "correct_answer" && e.sessionId) {
      if (!multipla[e.sessionId]) {
        multipla[e.sessionId] = {
          id: `multipla_${e.sessionId}`,
          reason: "correct_answer_sum",
          sessionId: e.sessionId,
          amount: 0,
          acertos: 0,
          xpMax: xpMaxPorSessao[e.sessionId] ?? null,
          createdAt: e.createdAt,
        };
      }
      multipla[e.sessionId].amount  += e.amount || 0;
      multipla[e.sessionId].acertos += 1;
    } else if (e.reason === "open_answer_graded") {
      // Enriquecer com o xpMax da questão aberta correspondente
      resultado.push({
        ...e,
        xpMax: xpMaxPorResposta[e.questionId] ?? null,
      });
    } else {
      resultado.push(e);
    }
  }

  for (const v of Object.values(multipla)) {
    resultado.push(v);
  }

  resultado.sort((a, b) => {
    const ta = a.createdAt?.toDate?.() ?? new Date(0);
    const tb = b.createdAt?.toDate?.() ?? new Date(0);
    return tb - ta;
  });

  return resultado;
}

function origemAgrupado(entry) {
  if (entry.reason === "presence")            return "Presença no quiz";
  if (entry.reason === "correct_answer_sum")  return `Múltipla escolha - ${entry.acertos} acerto${entry.acertos !== 1 ? "s" : ""}`;
  if (entry.reason === "open_answer_graded")  return "Questão aberta (corrigida pelo professor)";
  return "Bônus";
}

/** Formata o XP da entrada como "amount/xpMax XP" quando disponível, ou "+amount XP". */
function formatarXp(entry) {
  if (entry.amount <= 0) return "0 XP";
  if (entry.xpMax != null && entry.xpMax > 0) {
    return `${entry.amount}/${entry.xpMax} XP`;
  }
  return `+${entry.amount} XP`;
}

export default function CoursePageAluno() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { getCourseById }      = useCourses();
  const { getEnrolledClassIds } = useClasses();

  const [course, setCourse]       = useState(null);
  const [professor, setProfessor] = useState(null);
  const [loading, setLoading]     = useState(true);

  const [stats, setStats] = useState({
    totalSessoes: 0,
    totalRespostas: 0,
    totalAcertos: 0,
    totalXP: 0,
  });

  const [comparativos, setComparativos] = useState({
    xpDistribuido:    0,
    sessoesAplicadas: 0,
    totalPossivel:    0,
  });

  const [ranking, setRanking]         = useState([]);
  const [historicoXp, setHistoricoXp] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const data = await getCourseById(courseId);
      setCourse(data);

      if (data?.professorId) {
        const profSnap = await getDoc(doc(db, "usuarios", data.professorId));
        if (profSnap.exists()) setProfessor(profSnap.data());
      }

      // Turmas do aluno nesta disciplina
      const enrolledClassIds = await getEnrolledClassIds(user.uid);
      const classesSnap = await getDocs(query(
        collection(db, "classes"), where("courseId", "==", courseId)
      ));
      const classIds = classesSnap.docs
        .map(d => d.id)
        .filter(id => enrolledClassIds.includes(id));

      if (classIds.length === 0) { setLoading(false); return; }

      // Sessões
      const sessionsSnap = await getDocs(query(
        collection(db, "sessions"), where("courseId", "==", courseId)
      ));
      const todasSessoes = sessionsSnap.docs
        .filter(d => classIds.includes(d.data().classId))
        .map(d => ({ id: d.id, ...d.data() }));

      const sessoesEncerradas = todasSessoes.filter(s => s.status === "finished");
      const sessionIds        = todasSessoes.map(s => s.id);

      // Questões de cada quiz (cache)
      // Precisamos delas para:
      //   a) calcular o xpMax por sessão (múltipla escolha)
      //   b) calcular o xpMax por questão aberta
      const questoesPorQuiz = {};   // { [quizId]: Question[] }
      const quizIdsPorSessao = {};  // { [sessionId]: quizId }

      for (const s of sessoesEncerradas) {
        quizIdsPorSessao[s.id] = s.quizId;
        if (!questoesPorQuiz[s.quizId]) {
          const snap = await getDocs(collection(db, "quizzes", s.quizId, "questions"));
          questoesPorQuiz[s.quizId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }

      // xpMax de questões FECHADAS por sessão
      const xpMaxPorSessao = {};
      for (const s of sessoesEncerradas) {
        const questoes = questoesPorQuiz[s.quizId] ?? [];
        xpMaxPorSessao[s.id] = questoes
          .filter(q => q.tipo !== "aberta")
          .reduce((acc, q) => acc + (q.xp ?? 10), 0);
      }

      // xpMax por questionId (questões abertas)
      const xpMaxPorResposta = {};  // { [questionId]: number }
      for (const questoes of Object.values(questoesPorQuiz)) {
        for (const q of questoes) {
          if (q.tipo === "aberta") xpMaxPorResposta[q.id] = q.xp ?? 10;
        }
      }

      // XP do aluno
      const xpSnap = await getDocs(query(
        collection(db, "xp"),
        where("userId", "==", user.uid),
        where("classId", "in", classIds)
      ));
      const totalXP = xpSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

      const historicoBruto = xpSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() ?? new Date(0);
          const tb = b.createdAt?.toDate?.() ?? new Date(0);
          return tb - ta;
        });

      setHistoricoXp(agruparHistoricoXp(historicoBruto, xpMaxPorSessao, xpMaxPorResposta));

      // Respostas do aluno 
      let sessoesParticipadas = 0;
      let totalRespostas = 0;
      let totalAcertos   = 0;

      if (sessionIds.length > 0) {
        const answersSnap = await getDocs(query(
          collection(db, "session_answers"), where("userId", "==", user.uid)
        ));
        const respostas = answersSnap.docs
          .map(d => d.data())
          .filter(r => sessionIds.includes(r.sessionId));

        sessoesParticipadas = new Set(respostas.map(r => r.sessionId)).size;
        totalRespostas      = respostas.length;
        totalAcertos        = respostas.filter(r => r.isCorrect).length;
      }

      setStats({ totalSessoes: sessoesParticipadas, totalRespostas, totalAcertos, totalXP });

      // Comparativos
      const todosXpSnap = await getDocs(query(
        collection(db, "xp"), where("classId", "in", classIds)
      ));

      let xpPossivelTotal      = 0;
      let questoesPossivelTotal = 0;

      for (const sessao of sessoesEncerradas) {
        xpPossivelTotal += 10; // presença
        const questoes = questoesPorQuiz[sessao.quizId] ?? [];
        questoes.forEach(d => {
          xpPossivelTotal       += d.xp ?? 10;
          questoesPossivelTotal += 1;
        });
      }

      setComparativos({
        xpDistribuido:    xpPossivelTotal,
        sessoesAplicadas: sessoesEncerradas.length,
        totalPossivel:    questoesPossivelTotal,
      });

      // Ranking
      const todosEnrollmentsSnap = await getDocs(query(
        collection(db, "enrollments"), where("classId", "in", classIds)
      ));
      const userIds = todosEnrollmentsSnap.docs.map(d => d.data().userId).filter(Boolean);

      if (userIds.length > 0) {
        const xpPorUsuario = {};
        todosXpSnap.docs.forEach(d => {
          const { userId, amount } = d.data();
          if (!userId) return;
          xpPorUsuario[userId] = (xpPorUsuario[userId] || 0) + (amount || 0);
        });

        const rankingComNomes = await Promise.all(
          userIds.map(async uid => {
            const userSnap = await getDoc(doc(db, "usuarios", uid));
            const nome = userSnap.exists()
              ? (userSnap.data().nome || userSnap.data().email) : "Aluno";
            const xp = xpPorUsuario[uid] || 0;
            return { id: uid, nome, xp, nivel: getNivel(xp) };
          })
        );
        rankingComNomes.sort((a, b) => b.xp - a.xp);
        setRanking(rankingComNomes);
      }

      setLoading(false);
    };

    fetchData();
  }, [courseId, user]);

  if (loading) return <Spinner />;
  if (!course)  return <Spinner />;

  const precisao = stats.totalRespostas > 0
    ? Math.round((stats.totalAcertos / stats.totalRespostas) * 100) : 0;
  const meuNivel = getNivel(stats.totalXP);

  const pctXP       = comparativos.xpDistribuido > 0
    ? Math.round((stats.totalXP / comparativos.xpDistribuido) * 100) : 0;
  const pctSessoes  = comparativos.sessoesAplicadas > 0
    ? Math.round((stats.totalSessoes / comparativos.sessoesAplicadas) * 100) : 0;
  const pctQuestoes = comparativos.totalPossivel > 0
    ? Math.round((stats.totalAcertos / comparativos.totalPossivel) * 100) : 0;

  return (
    <div style={container}>
      <BackButton />
      <div style={header}>
        <h1>{course.nome}</h1>
        <p style={{ color: "var(--texto-suave)" }}>
          Professor: {professor?.nome || professor?.email}
        </p>
      </div>

      {/* Desempenho */}
      <div style={card}>
        <h2>Meu Desempenho</h2>
        {stats.totalRespostas === 0 && stats.totalXP === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>
            Você ainda não participou de nenhuma sessão nesta disciplina.
          </p>
        ) : (
          <>
            {meuNivel.label !== "-" && meuNivel.codepoint && (
              <div style={nivelBadge}>
                <TwemojiImg
                  codepoint={NIVEL_CODEPOINTS[meuNivel.label] || meuNivel.codepoint}
                  size={36} alt={meuNivel.label}
                />
                <span style={nivelLabel}>{meuNivel.label}</span>
              </div>
            )}

            <div style={statsGrid}>
              <StatBox
                valor={stats.totalXP}
                comparativo={comparativos.xpDistribuido}
                label="XP total"
                pct={pctXP}
              />
              <StatBox
                valor={stats.totalSessoes}
                comparativo={comparativos.sessoesAplicadas}
                label="Quizzes participados"
                pct={pctSessoes}
              />
              <StatBox
                valor={stats.totalAcertos}
                comparativo={comparativos.totalPossivel}
                label="Acertos"
                pct={pctQuestoes}
              />
              <StatBox
                valor={`${precisao}%`}
                comparativo={null}
                label="Precisão nas respostas"
                pct={precisao}
                isPercent
              />
            </div>
          </>
        )}
      </div>

      {/* Histórico de XP */}
      {historicoXp.length > 0 && (
        <div style={card}>
          <h2>Histórico de XP</h2>
          <p style={{ fontSize: "13px", color: "var(--texto-suave)", marginBottom: "16px" }}>
            Registro de todos os XPs recebidos nesta disciplina.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Origem</th>
                <th style={thStyle}>XP</th>
              </tr>
            </thead>
            <tbody>
              {historicoXp.map(entry => (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--borda)" }}>
                  <td style={tdStyle}>
                    {entry.createdAt?.toDate
                      ? entry.createdAt.toDate().toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "left", fontSize: "13px" }}>
                    {origemAgrupado(entry)}
                  </td>
                  <td style={tdStyle}>
                    <span style={entry.amount > 0 ? xpBadge : xpBadgeZero}>
                      {formatarXp(entry)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: "12px", color: "var(--texto-muito-suave)", marginTop: "12px", textAlign: "right" }}>
            Total: <strong>{stats.totalXP} XP</strong>
          </p>
        </div>
      )}

      {/* Ranking */}
      <div style={card}>
        <h2>Ranking da Turma</h2>
        {ranking.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhum aluno com XP ainda.</p>
        ) : (
          <RankingTable players={ranking} highlightUserId={user.uid} showNivel={true} />
        )}
      </div>
    </div>
  );
}

/* StatBox */
function StatBox({ valor, comparativo, label, pct, isPercent }) {
  const cor = pct >= 70 ? "var(--cor-primaria)"
            : pct >= 40 ? "var(--cor-alerta)"
            : pct > 0   ? "var(--cor-perigo)"
            : "var(--texto-muito-suave)";

  // Exibe fração "valor/comparativo" quando há denominador, caso contrário só o valor
  const display = isPercent
    ? String(valor)
    : (comparativo != null && comparativo > 0)
      ? `${valor}/${comparativo}`
      : String(valor);

  return (
    <div style={statBox}>
      <span style={{ ...statNumber, color: cor }}>{display}</span>
      <span style={{ ...statLabel, color: "var(--texto)" }}>{label}</span>
      <div style={statBarFundo}>
        <div style={{ ...statBarPreenchida, width: `${Math.min(pct, 100)}%`, background: cor }} />
      </div>
    </div>
  );
}

/* EstiloS */
const container = { minHeight: "100vh", background: "transparent", padding: "30px" };
const header    = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto 30px auto", padding: "20px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const statsGrid = {
  display: "grid", gridTemplateColumns: "1fr 1fr",
  gap: "12px", marginTop: "16px",
};
const statBox = {
  background: "var(--bg-input)", borderRadius: "10px", padding: "16px 10px 14px",
  display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
};
const statNumber = { fontSize: "22px", fontWeight: "bold", lineHeight: 1 };
const statLabel  = { fontSize: "12px", textAlign: "center", fontWeight: "600" };
const statBarFundo = {
  width: "80%", height: "5px", background: "var(--borda)",
  borderRadius: "4px", overflow: "hidden", marginTop: "4px",
};
const statBarPreenchida = {
  height: "100%", borderRadius: "4px", transition: "width 0.5s ease",
};
const nivelBadge = {
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: "10px", marginBottom: "8px",
};
const nivelLabel = { fontSize: "20px", fontWeight: "bold", color: "var(--texto-suave)" };
const thStyle = {
  padding: "8px", fontSize: "12px", color: "var(--texto-muito-suave)",
  borderBottom: "2px solid var(--borda)", textAlign: "center",
};
const tdStyle = {
  padding: "10px 8px", fontSize: "13px",
  textAlign: "center", color: "var(--texto)",
};
const xpBadge = {
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  fontWeight: "bold", fontSize: "12px", padding: "3px 8px", borderRadius: "10px",
};
const xpBadgeZero = {
  background: "var(--bg-hover)", color: "var(--texto-muito-suave)",
  fontWeight: "bold", fontSize: "12px", padding: "3px 8px", borderRadius: "10px",
  border: "1px solid var(--borda)",
};