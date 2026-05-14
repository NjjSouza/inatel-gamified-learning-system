import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCourses } from "../hooks/useCourses";
import { useClasses } from "../hooks/useClasses";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import Spinner from "../components/Spinner";
import RankingTable from "../components/RankingTable";
import TwemojiImg from "../components/TwemojiImg";
import BackButton from "../components/BackButton";

const NIVEL_CODEPOINTS = {
  "Pedra":    "1faa8",
  "Bronze":   "1f949",
  "Prata":    "1f948",
  "Ouro":     "1f947",
  "Platina":  "1f52e",
  "Diamante": "1f48e",
};

function getNivel(xp) {
  if (xp <= 200) return { label: "Pedra" };
  if (xp <= 400) return { label: "Bronze" };
  if (xp <= 600) return { label: "Prata" };
  if (xp <= 800) return { label: "Ouro" };
  if (xp <= 1000) return { label: "Platina" };
  return { label: "Diamante" };
}

export default function CoursePageAluno() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { getCourseById } = useCourses();
  const { getEnrolledClassIds } = useClasses();

  const [course, setCourse] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [stats, setStats] = useState({
    totalSessoes: 0,
    totalRespostas: 0,
    totalAcertos: 0,
    totalXP: 0,
  });
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const data = await getCourseById(courseId);
      setCourse(data);

      if (data?.professorId) {
        const profSnap = await getDoc(doc(db, "usuarios", data.professorId));
        if (profSnap.exists()) setProfessor(profSnap.data());
      }

      // Turmas do aluno nessa disciplina
      const enrolledClassIds = await getEnrolledClassIds(user.uid);

      const classesSnap = await getDocs(query(
        collection(db, "classes"),
        where("courseId", "==", courseId)
      ));

      const classIds = classesSnap.docs
        .map(d => d.id)
        .filter(id => enrolledClassIds.includes(id));

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      // Sessões dessas turmas
      const sessionsSnap = await getDocs(query(
        collection(db, "sessions"),
        where("courseId", "==", courseId)
      ));

      const sessionIds = sessionsSnap.docs
        .filter(d => classIds.includes(d.data().classId))
        .map(d => d.id);

      // Respostas do aluno
      if (sessionIds.length > 0) {
        const answersSnap = await getDocs(query(
          collection(db, "session_answers"),
          where("userId", "==", user.uid)
        ));

        const respostas = answersSnap.docs
          .map(d => d.data())
          .filter(r => sessionIds.includes(r.sessionId));

        const sessoesParticipadas = new Set(respostas.map(r => r.sessionId)).size;
        const acertos = respostas.filter(r => r.isCorrect).length;

        // XP do aluno nessa disciplina
        const xpSnap = await getDocs(query(
          collection(db, "xp"),
          where("userId", "==", user.uid),
          where("classId", "in", classIds)
        ));
        const totalXP = xpSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

        setStats({
          totalSessoes: sessoesParticipadas,
          totalRespostas: respostas.length,
          totalAcertos: acertos,
          totalXP,
        });
      }

      // Ranking: XP de todos os alunos nessas turmas
      const todosEnrollmentsSnap = await getDocs(query(
        collection(db, "enrollments"),
        where("classId", "in", classIds)
      ));

      const userIds = todosEnrollmentsSnap.docs
        .map(d => d.data().userId)
        .filter(Boolean);

      if (userIds.length === 0) {
        setLoading(false);
        return;
      }

      // XP de todos os alunos
      const todosXpSnap = await getDocs(query(
        collection(db, "xp"),
        where("classId", "in", classIds)
      ));

      // Agrupa XP por userId
      const xpPorUsuario = {};
      todosXpSnap.docs.forEach(d => {
        const { userId, amount } = d.data();
        if (!userId) return;
        xpPorUsuario[userId] = (xpPorUsuario[userId] || 0) + (amount || 0);
      });

      // Busca nomes dos usuários
      const rankingComNomes = await Promise.all(
        userIds.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "usuarios", uid));
          const nome = userSnap.exists()
            ? (userSnap.data().nome || userSnap.data().email)
            : "Aluno";
          const xp = xpPorUsuario[uid] || 0;
          return { id: uid, nome, xp, nivel: getNivel(xp) };
        })
      );

      rankingComNomes.sort((a, b) => b.xp - a.xp);
      setRanking(rankingComNomes);
      setLoading(false);
    };

    fetchData();
  }, [courseId, user]);

  if (!course) return <Spinner />;

  const precisao = stats.totalRespostas > 0
    ? Math.round((stats.totalAcertos / stats.totalRespostas) * 100)
    : 0;

  const meuNivel = getNivel(stats.totalXP);

  return (
    <div style={container}>
      <BackButton />
      <div style={header}>
        <h1>{course.nome}</h1>
        <p>Professor: {professor?.nome || professor?.email}</p>
      </div>

      {/* Desempenho */}
      <div style={card}>
        <h2>Meu Desempenho</h2>

        {loading ? (
          <p>Carregando...</p>
        ) : stats.totalRespostas === 0 ? (
          <p>Você ainda não participou de nenhuma sessão nesta disciplina.</p>
        ) : (
          <>
            <div style={nivelBadge}>
              <TwemojiImg
                codepoint={NIVEL_CODEPOINTS[meuNivel.label]}
                size={36}
                alt={meuNivel.label}
              />
              <span style={nivelLabel}>{meuNivel.label}</span>
            </div>

            <div style={statsGrid}>
              <div style={statBox}>
                <span style={statNumber}>{stats.totalXP}</span>
                <span style={statLabel}>XP Total</span>
              </div>
              <div style={statBox}>
                <span style={statNumber}>{stats.totalSessoes}</span>
                <span style={statLabel}>Quizzes respondidos</span>
              </div>
              <div style={statBox}>
                <span style={statNumber}>{stats.totalAcertos}</span>
                <span style={statLabel}>Acertos</span>
              </div>
              <div style={statBox}>
                <span style={statNumber}>{precisao}%</span>
                <span style={statLabel}>Precisão</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ranking */}
      <div style={card}>
        <h2>Ranking da Turma</h2>

        {loading ? (
          <p>Carregando...</p>
        ) : ranking.length === 0 ? (
          <p>Nenhum aluno com XP ainda.</p>
        ) : (
          <RankingTable
            players={ranking}
            highlightUserId={user.uid}
            showNivel={true}
          />
        )}
      </div>
    </div>
  );
}

const container = { minHeight: "100vh", background: "transparent", padding: "30px" };
const header = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "600px", margin: "0 auto 30px auto", padding: "20px",
  background: "var(--bg-card)", borderRadius: "10px",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)", textAlign: "center"
};
const statsGrid = {
  display: "grid", gridTemplateColumns: "1fr 1fr",
  gap: "15px", marginTop: "15px"
};
const statBox = {
  background: "var(--bg)", borderRadius: "10px", padding: "20px 10px",
  display: "flex", flexDirection: "column", alignItems: "center", gap: "6px"
};
const statNumber = { fontSize: "28px", fontWeight: "bold", color: "#32ae36" };
const statLabel = { fontSize: "13px", color: "var(--texto-suave)" };
const nivelBadge = {
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: "10px", marginBottom: "15px"
};
const nivelLabel = { fontSize: "20px", fontWeight: "bold", color: "var(--texto-suave)" };