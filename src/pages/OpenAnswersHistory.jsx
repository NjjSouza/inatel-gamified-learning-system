import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import BackButton from "../components/BackButton";

/**
 * Página somente-leitura de respostas abertas de UMA sessão específica.
 * Recebe :sessionId via rota. Não guarda cache global; cada acesso
 * busca apenas os dados daquela sessão 
 */
export default function OpenAnswersHistory() {
  const { sessionId } = useParams();
  const { getOpenAnswersForSession } = useSessions();
  const { getQuestions } = useQuizzes();

  const [loading, setLoading]   = useState(true);
  const [sessao, setSessao]     = useState(null);   // dados da sessão
  const [quizNome, setQuizNome] = useState("");
  const [porQuestao, setPorQuestao] = useState({}); // { [questionId]: { questao, respostas[] } }

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Sessão
        const sessSnap = await getDoc(doc(db, "sessions", sessionId));
        if (!sessSnap.exists()) return;
        const sessData = { id: sessSnap.id, ...sessSnap.data() };
        setSessao(sessData);

        // Nome do quiz
        const quizSnap = await getDoc(doc(db, "quizzes", sessData.quizId));
        setQuizNome(quizSnap.exists() ? quizSnap.data().nome : "Quiz");

        // Questões abertas do quiz
        const todasQuestoes  = await getQuestions(sessData.quizId);
        const questoesAbertas = todasQuestoes.filter(q => q.tipo === "aberta");

        // Respostas abertas da sessão
        const respostas = await getOpenAnswersForSession(sessionId);

        // Nomes dos alunos
        const userIds = [...new Set(respostas.map(r => r.userId).filter(Boolean))];
        const nomes   = {};
        await Promise.all(userIds.map(async uid => {
          const snap = await getDoc(doc(db, "usuarios", uid));
          nomes[uid] = snap.exists() ? (snap.data().nome || snap.data().email) : uid;
        }));

        // Agrupa respostas por questão
        const agrupado = {};
        questoesAbertas.forEach(q => {
          agrupado[q.id] = { questao: q, respostas: [] };
        });
        respostas.forEach(r => {
          if (agrupado[r.questionId]) {
            agrupado[r.questionId].respostas.push({
              ...r,
              nomeAluno: nomes[r.userId] || "Aluno",
            });
          }
        });

        setPorQuestao(agrupado);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [sessionId]);

  if (loading) return <Spinner />;
  if (!sessao)  return (
    <div style={container}>
      <BackButton />
      <p style={{ color: "var(--texto-suave)" }}>Sessão não encontrada.</p>
    </div>
  );

  const totalRespostas = Object.values(porQuestao)
    .reduce((sum, q) => sum + q.respostas.length, 0);
  const corrigidas = Object.values(porQuestao)
    .reduce((sum, q) => sum + q.respostas.filter(r =>
      r.isCorrect !== null && r.isCorrect !== undefined
    ).length, 0);
  const pendentes = totalRespostas - corrigidas;

  return (
    <div style={container}>
      <BackButton />

      {/* Cabeçalho */}
      <div style={pageHeader}>
        <div>
          <h1>{quizNome}</h1>
          <p style={{ color: "var(--texto-suave)", fontSize: "14px", margin: "4px 0 0" }}>
            {sessao.finishedAt?.toDate
              ? sessao.finishedAt.toDate().toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : "-"}
            {sessao.classeSemestre ? ` - ${sessao.classeSemestre}` : ""}
          </p>
        </div>
        <div style={headerBadges}>
          {pendentes > 0 ? (
            <span style={badgePendente}>
              {pendentes} pendente{pendentes !== 1 ? "s" : ""}
            </span>
          ) : totalRespostas > 0 ? (
            <span style={badgeCorrigida}>Todas corrigidas</span>
          ) : null}
          {totalRespostas > 0 && (
            <span style={contadorLabel}>{corrigidas}/{totalRespostas} corrigidas</span>
          )}
        </div>
      </div>

      {/* Sem respostas */}
      {totalRespostas === 0 && (
        <div style={card}>
          <p style={{ color: "var(--texto-suave)" }}>
            Nenhuma resposta aberta registrada nesta sessão.
          </p>
        </div>
      )}

      {/* Questões */}
      {Object.entries(porQuestao).map(([qId, { questao, respostas }], qi) => (
        <div key={qId} style={card}>
          {/* Cabeçalho da questão */}
          <div style={questaoHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={questaoNum}>Questão aberta {qi + 1}</span>
              {questao && (
                <span style={xpBadge}>⚡ {questao.xp ?? 10} XP</span>
              )}
            </div>
            <span style={respostasCount}>
              {respostas.length} resposta{respostas.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p style={questaoTexto}>{questao?.pergunta || "Questão removida"}</p>

          {respostas.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--texto-muito-suave)", fontStyle: "italic" }}>
              Nenhum aluno respondeu esta questão.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {respostas.map(resp => {
                const corrigida = resp.isCorrect !== null && resp.isCorrect !== undefined;
                const xpMax     = questao?.xp ?? 10;

                return (
                  <div key={resp.id} style={respostaCard(resp.isCorrect, corrigida)}>
                    {/* Topo: aluno + status */}
                    <div style={respostaTop}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={alunoAvatar}>
                          {resp.nomeAluno.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--texto)", display: "block" }}>
                            {resp.nomeAluno}
                          </span>
                          {corrigida ? (
                            <span style={{
                              fontSize: "11px", fontWeight: "bold",
                              display: "block", marginTop: "2px",
                              color: resp.isCorrect ? "var(--cor-primaria)" : "var(--cor-perigo)",
                            }}>
                              {resp.isCorrect
                                /* Exibe a fração xpConcedido/xpMax quando correto */
                                ? `Correto - ${resp.xp ?? 0}/${xpMax} XP`
                                : "Errado - 0 XP"}
                            </span>
                          ) : (
                            <span style={badgePendenteInline}>aguardando correção</span>
                          )}
                        </div>
                      </div>

                      {corrigida && (
                        <span style={{
                          fontSize: "13px", fontWeight: "bold", flexShrink: 0,
                          color: resp.isCorrect ? "var(--cor-primaria)" : "var(--cor-perigo)",
                        }}>
                          {resp.isCorrect ? "Correto" : "Errado"}
                        </span>
                      )}
                    </div>

                    {/* Texto da resposta */}
                    <div style={respostaTextoBox}>
                      <p style={{
                        margin: 0, fontSize: "14px", color: "var(--texto)",
                        lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {resp.respostaTexto}
                      </p>
                    </div>

                    {resp.answeredAt?.toDate && (
                      <p style={{ fontSize: "11px", color: "var(--texto-muito-suave)", marginTop: "6px", textAlign: "right" }}>
                        Respondido em {resp.answeredAt.toDate().toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* Estilos */
const container = {
  minHeight: "100vh", background: "transparent",
  padding: "30px", maxWidth: "800px", margin: "0 auto",
};

const pageHeader = {
  display: "flex", justifyContent: "space-between",
  alignItems: "flex-start", flexWrap: "wrap", gap: "12px",
  marginBottom: "24px",
};

const headerBadges = {
  display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
};

const card = {
  background: "var(--bg-card)", borderRadius: "12px",
  padding: "20px", marginBottom: "20px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
};

const contadorLabel = {
  fontSize: "13px", fontWeight: "bold", color: "var(--texto-muito-suave)",
};

const questaoHeader = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px",
};

const questaoNum = {
  fontSize: "11px", fontWeight: "bold",
  color: "var(--texto-muito-suave)",
  textTransform: "uppercase", letterSpacing: "0.5px",
};

const xpBadge = {
  fontSize: "12px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "2px 8px", borderRadius: "10px",
  display: "inline-flex", alignItems: "center", gap: "3px",
};

const respostasCount = {
  fontSize: "12px", color: "var(--texto-muito-suave)",
};

const questaoTexto = {
  fontSize: "15px", fontWeight: "600", color: "var(--texto)",
  margin: "0 0 12px", lineHeight: 1.4,
};

const respostaCard = (isCorrect, corrigida) => ({
  border: `1px solid ${
    !corrigida    ? "var(--borda)"
    : isCorrect   ? "var(--cor-primaria-borda)"
    : "var(--cor-perigo-borda)"
  }`,
  borderRadius: "10px", padding: "12px",
  background: !corrigida  ? "var(--bg-input)"
            : isCorrect   ? "var(--cor-primaria-claro)"
            : "var(--cor-perigo-claro)",
});

const respostaTop = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "10px",
};

const alunoAvatar = {
  width: "32px", height: "32px", borderRadius: "50%",
  background: "var(--cor-primaria)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "14px", fontWeight: "bold", flexShrink: 0,
};

const respostaTextoBox = {
  background: "var(--bg-card)", borderRadius: "8px",
  padding: "10px 12px", border: "1px solid var(--borda)",
};

const badgePendente = {
  fontSize: "11px", padding: "3px 9px", borderRadius: "10px",
  background: "var(--cor-aviso-claro)", color: "var(--cor-aviso)",
  fontWeight: "bold", border: "1px solid var(--cor-aviso-borda)",
};

const badgePendenteInline = {
  fontSize: "11px", fontWeight: "bold",
  display: "inline-block", marginTop: "2px",
  color: "var(--cor-aviso)",
};

const badgeCorrigida = {
  fontSize: "11px", padding: "3px 9px", borderRadius: "10px",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  fontWeight: "bold", border: "1px solid var(--cor-primaria-borda)",
};