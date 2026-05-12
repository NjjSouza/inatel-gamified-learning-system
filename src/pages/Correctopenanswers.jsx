import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import TwemojiImg from "../components/TwemojiImg";

export default function CorrectOpenAnswers() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { getOpenAnswersForSession, gradeOpenAnswer } = useSessions();
  const { getQuestions } = useQuizzes();

  const [session, setSession]   = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [nomes, setNomes]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState({});

  const fetchTudo = async () => {
    setLoading(true);
    try {
      // Sessão
      const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionSnap.exists()) return;
      const sessData = { id: sessionSnap.id, ...sessionSnap.data() };
      setSession(sessData);

      // Questões do quiz (apenas abertas)
      const todasQuestoes = await getQuestions(sessData.quizId);
      const abertas = todasQuestoes.filter(q => q.tipo === "aberta");
      setQuestoes(abertas);

      // Respostas abertas desta sessão
      const respostasData = await getOpenAnswersForSession(sessionId);

      const userIds = [...new Set(respostasData.map(r => r.userId).filter(Boolean))];
      const nomesMap = {};
      await Promise.all(userIds.map(async (uid) => {
        const snap = await getDoc(doc(db, "usuarios", uid));
        nomesMap[uid] = snap.exists() ? (snap.data().nome || snap.data().email) : uid;
      }));
      setNomes(nomesMap);
      setRespostas(respostasData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTudo(); }, [sessionId]);

  const handleGrade = async (resposta, isCorrect) => {
    const acao = isCorrect ? "Correto" : "Errado";

    // Se já foi corrigida anteriormente, reforça avisos
    if (resposta.isCorrect !== null && resposta.isCorrect !== undefined) {
      if (!window.confirm(
        `Esta resposta já foi marcada como "${resposta.isCorrect ? "correta" : "errada"}".\n` +
        `Deseja alterá-la para "${acao}"?\n\n` +
        (isCorrect
          ? "Isso irá conceder XP adicional ao aluno."
          : "O XP já concedido NÃO será revertido automaticamente.")
      )) return;
    } else {
      if (!window.confirm(
        `Marcar como ${acao}?\n\n"${resposta.respostaTexto}"\n\n` +
        (isCorrect ? `O aluno receberá XP por esta questão.` : "Nenhum XP será concedido.")
      )) return;
    }

    setSaving(prev => ({ ...prev, [resposta.id]: true }));
    try {
      // Busca o XP da questão correspondente
      const questao = questoes.find(q => q.id === resposta.questionId);
      const xpAmount = questao?.xp ?? 10;
      await gradeOpenAnswer(resposta.id, isCorrect, resposta.userId, resposta.classId, sessionId, resposta.questionId, xpAmount);
      setRespostas(prev => prev.map(r =>
        r.id === resposta.id ? { ...r, isCorrect, xp: isCorrect ? xpAmount : 0 } : r
      ));
    } catch (e) {
      alert("Erro ao salvar correção: " + e.message);
    } finally {
      setSaving(prev => ({ ...prev, [resposta.id]: false }));
    }
  };

  if (loading) return <Spinner />;
  if (!session) return <div style={container}><p>Sessão não encontrada.</p></div>;

  // Agrupa respostas por questionId
  const respostasPorQuestao = {};
  questoes.forEach(q => { respostasPorQuestao[q.id] = []; });
  respostas.forEach(r => {
    if (respostasPorQuestao[r.questionId]) respostasPorQuestao[r.questionId].push(r);
  });

  const totalRespostas = respostas.length;
  const totalCorrigidas = respostas.filter(r => r.isCorrect !== null && r.isCorrect !== undefined).length;
  const tudo100 = totalRespostas > 0 && totalCorrigidas === totalRespostas;

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h1>Correção de Questões Abertas</h1>
          <p style={{ color: "var(--texto-suave)", fontSize: "14px", margin: "4px 0 0" }}>
            Sessão encerrada - Código: <strong>{session.pin}</strong>
          </p>
        </div>
        <div style={progressBox}>
          <span style={progressNum}>{totalCorrigidas}/{totalRespostas}</span>
          <span style={progressLabel}>corrigidas</span>
        </div>
      </div>

      {tudo100 && (
        <div style={successBanner}>
          Todas as respostas foram corrigidas! XPs creditados aos alunos.
        </div>
      )}

      {questoes.length === 0 ? (
        <div style={card}><p style={{ color: "var(--texto-suave)" }}>Nenhuma questão aberta encontrada.</p></div>
      ) : (
        questoes.map((questao, qi) => {
          const respostasQuestao = respostasPorQuestao[questao.id] || [];
          const corrigidasQuestao = respostasQuestao.filter(
            r => r.isCorrect !== null && r.isCorrect !== undefined
          ).length;

          return (
            <div key={questao.id} style={card}>
              {/* Cabeçalho da questão */}
              <div style={questaoHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={questaoNum}>Questão {qi + 1}</span>
                  <span style={xpBadge}>
                    <TwemojiImg codepoint="26a1" size={14} alt="xp" /> {questao.xp ?? 10} XP
                  </span>
                </div>
                <span style={corrigidasBadge(corrigidasQuestao, respostasQuestao.length)}>
                  {corrigidasQuestao}/{respostasQuestao.length} corrigidas
                </span>
              </div>
              <p style={questaoTexto}>{questao.pergunta}</p>

              {respostasQuestao.length === 0 ? (
                <p style={{ color: "var(--texto-muito-suave)", fontSize: "13px" }}>
                  Nenhum aluno respondeu esta questão.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {respostasQuestao.map((resp) => {
                    const nome = nomes[resp.userId] || "Aluno";
                    const jaCorrigida = resp.isCorrect !== null && resp.isCorrect !== undefined;
                    const isSaving = saving[resp.id];

                    return (
                      <div key={resp.id} style={respostaCard(resp.isCorrect)}>
                        <div style={respostaTop}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={alunoAvatar}>{nome.charAt(0).toUpperCase()}</span>
                            <div>
                              <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--texto)", display: "block" }}>
                                {nome}
                              </span>
                              {jaCorrigida && (
                                <span style={{
                                  fontSize: "11px", fontWeight: "bold", display: "block", marginTop: "2px",
                                  color: resp.isCorrect ? "var(--cor-primaria)" : "var(--cor-perigo)",
                                }}>
                                  {resp.isCorrect ? `Correto (+${resp.xp} XP)` : "Errado"}
                                </span>
                              )}
                            </div>
                          </div>

                          {!jaCorrigida ? (
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                              <button
                                onClick={() => handleGrade(resp, true)} disabled={isSaving}
                                style={{ ...btnCerto, opacity: isSaving ? 0.6 : 1 }}
                              >
                                {isSaving ? "..." : "Correto"}
                              </button>
                              <button
                                onClick={() => handleGrade(resp, false)} disabled={isSaving}
                                style={{ ...btnErrado, opacity: isSaving ? 0.6 : 1 }}
                              >
                                {isSaving ? "..." : "Errado"}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGrade(resp, !resp.isCorrect)} disabled={isSaving}
                              style={btnAlterar}
                            >
                              {isSaving ? "..." : "Alterar"}
                            </button>
                          )}
                        </div>

                        <div style={respostaTextoBox}>
                          <p style={{
                            margin: 0, fontSize: "14px", color: "var(--texto)",
                            lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                          }}>
                            {resp.respostaTexto}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* Estilos */
const container = {
  minHeight: "100vh", background: "transparent",
  padding: "30px", maxWidth: "800px", margin: "0 auto",
};
const header = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  marginBottom: "24px", flexWrap: "wrap", gap: "12px",
};
const progressBox = {
  display: "flex", flexDirection: "column", alignItems: "center",
  background: "var(--bg-card)", borderRadius: "10px",
  padding: "12px 20px", boxShadow: "var(--sombra-card)",
  border: "1px solid var(--borda)",
};
const progressNum = {
  fontSize: "24px", fontWeight: "bold",
  fontFamily: "'Fredoka One', sans-serif", color: "var(--cor-primaria)",
};
const progressLabel = { fontSize: "12px", color: "var(--texto-muito-suave)" };
const successBanner = {
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  borderRadius: "10px", padding: "14px 20px",
  marginBottom: "20px", fontWeight: "bold", fontSize: "14px",
  border: "1px solid var(--cor-primaria-borda)",
};
const card = {
  background: "var(--bg-card)", borderRadius: "12px",
  padding: "20px", marginBottom: "20px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
};
const questaoHeader = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px",
};
const questaoNum = {
  fontSize: "12px", fontWeight: "bold", color: "var(--texto-muito-suave)",
  textTransform: "uppercase", letterSpacing: "0.5px",
};
const xpBadge = {
  fontSize: "12px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "2px 8px", borderRadius: "10px",
  display: "inline-flex", alignItems: "center", gap: "4px",
};
const corrigidasBadge = (done, total) => ({
  fontSize: "12px", fontWeight: "bold",
  background: done === total && total > 0 ? "var(--cor-primaria-claro)" : "var(--bg-input)",
  color: done === total && total > 0 ? "var(--cor-primaria-texto)" : "var(--texto-suave)",
  padding: "3px 10px", borderRadius: "10px",
  border: "1px solid var(--borda)",
});
const questaoTexto = {
  fontSize: "16px", fontWeight: "600", color: "var(--texto)",
  margin: "0 0 16px", lineHeight: 1.4,
};
const respostaCard = (isCorrect) => ({
  border: `2px solid ${
    isCorrect === true  ? "var(--cor-primaria)"
    : isCorrect === false ? "var(--cor-perigo)"
    : "var(--borda)"
  }`,
  borderRadius: "10px", padding: "14px",
  background: isCorrect === true  ? "var(--cor-primaria-claro)"
            : isCorrect === false ? "var(--cor-perigo-claro)"
            : "var(--bg-input)",
  transition: "border-color 0.2s, background 0.2s",
});
const respostaTop = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px",
};
const alunoAvatar = {
  width: "34px", height: "34px", borderRadius: "50%",
  background: "var(--cor-primaria)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "15px", fontWeight: "bold", flexShrink: 0,
};
const btnCerto = {
  padding: "7px 14px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const btnErrado = {
  padding: "7px 14px", borderRadius: "8px", border: "none",
  background: "var(--cor-perigo)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const btnAlterar = {
  padding: "6px 12px", borderRadius: "8px",
  border: "1px solid var(--borda)", background: "var(--bg-card)",
  color: "var(--texto-suave)", fontSize: "12px", cursor: "pointer",
};
const respostaTextoBox = {
  background: "var(--bg-card)", borderRadius: "8px",
  padding: "10px 14px", border: "1px solid var(--borda)",
};