import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import Spinner from "../components/Spinner";
import BackButton from "../components/BackButton";
import TwemojiImg from "../components/TwemojiImg";

// Estados possíveis de correção local (nunca vão ao BD até confirmação final)
// null     = ainda não corrigido
// true     = marcado como correto (localmente)
// false    = marcado como errado (localmente)

export default function CorrectOpenAnswers() {
  const { sessionId } = useParams();
  const { getOpenAnswersForSession, gradeOpenAnswersBatch } = useSessions();
  const { getQuestions } = useQuizzes();

  const [session, setSession]     = useState(null);
  const [questoes, setQuestoes]   = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [nomes, setNomes]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [enviando, setEnviando]   = useState(false);
  const [enviado, setEnviado]     = useState(false);

  // Estado local de correção: { [answerId]: { isCorrect: bool|null, xp: number } }
  const [correcaoLocal, setCorrecaoLocal] = useState({});

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
      await Promise.all(userIds.map(async uid => {
        const snap = await getDoc(doc(db, "usuarios", uid));
        nomesMap[uid] = snap.exists() ? (snap.data().nome || snap.data().email) : uid;
      }));
      setNomes(nomesMap);
      setRespostas(respostasData);

      // Inicializa estado local com o que já foi salvo anteriormente (se houver)
      // e com o XP máximo de cada questão como valor padrão
      const inicialLocal = {};
      respostasData.forEach(r => {
        const questao = todasQuestoes.find(q => q.id === r.questionId);
        const xpMax   = questao?.xp ?? 10;
        inicialLocal[r.id] = {
          // Se já tinha correção salva no BD, parte dela; senão, null
          isCorrect: (r.isCorrect !== null && r.isCorrect !== undefined) ? r.isCorrect : null,
          xp: r.xp > 0 ? r.xp : xpMax,
          xpMax,
        };
      });
      setCorrecaoLocal(inicialLocal);

      // Se todas já estavam corrigidas, marca como enviado
      const todasCorrigidas = respostasData.every(
        r => r.isCorrect !== null && r.isCorrect !== undefined
      );
      if (todasCorrigidas && respostasData.length > 0) setEnviado(true);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTudo(); }, [sessionId]);

  // Marcar localmente
  const marcarLocal = (answerId, isCorrect) => {
    setCorrecaoLocal(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], isCorrect },
    }));
  };

  const setXpLocal = (answerId, valor) => {
    setCorrecaoLocal(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], xp: valor },
    }));
  };

  // Confirmar e enviar tudo
  const handleConfirmar = async () => {
    const pendentes = respostas.filter(
      r => correcaoLocal[r.id]?.isCorrect === null
    );
    if (pendentes.length > 0) {
      alert(`Ainda há ${pendentes.length} resposta${pendentes.length > 1 ? "s" : ""} sem correção. Corrija todas antes de confirmar.`);
      return;
    }

    if (!window.confirm(
      `Confirmar e enviar XP para todos os alunos?\n\n` +
      `Esta ação creditará o XP das respostas corretas. Você ainda poderá visualizar as respostas depois.`
    )) return;

    setEnviando(true);
    try {
      const correcoes = respostas.map(r => {
        const local = correcaoLocal[r.id];
        const xpFinal = local.isCorrect
          ? Math.max(0, Math.min(parseInt(local.xp, 10) || 0, local.xpMax))
          : 0;
        return {
          answerId:   r.id,
          isCorrect:  local.isCorrect,
          xpAmount:   xpFinal,
          userId:     r.userId,
          classId:    r.classId,
          questionId: r.questionId,
        };
      });

      await gradeOpenAnswersBatch(correcoes, sessionId);
      setEnviado(true);
    } catch (e) {
      alert("Erro ao enviar correções: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <Spinner />;
  if (!session) return <div style={container}><p>Sessão não encontrada.</p></div>;

  // Agrupa respostas por questão
  const respostasPorQuestao = {};
  questoes.forEach(q => { respostasPorQuestao[q.id] = []; });
  respostas.forEach(r => {
    if (respostasPorQuestao[r.questionId]) respostasPorQuestao[r.questionId].push(r);
  });

  const totalRespostas  = respostas.length;
  const totalCorrigidas = respostas.filter(r => correcaoLocal[r.id]?.isCorrect !== null).length;
  const todasMarcadas   = totalCorrigidas === totalRespostas && totalRespostas > 0;

  return (
    <div style={container}>
      <BackButton />

      {/* Cabeçalho */}
      <div style={header}>
        <div>
          <h1>Correção de Questões Abertas</h1>
          <p style={{ color: "var(--texto-suave)", fontSize: "14px", margin: "4px 0 0" }}>
            Sessão encerrada - Código: <strong>{session.pin}</strong>
          </p>
        </div>
        <div style={progressBox}>
          <span style={progressNum}>{totalCorrigidas}/{totalRespostas}</span>
          <span style={progressLabel}>marcadas</span>
        </div>
      </div>

      {/* Banner de enviado */}
      {enviado && (
        <div style={successBanner}>
          XPs enviados! Os alunos já podem ver seus pontos.
        </div>
      )}

      {/* Banner de instrução (antes de enviar) */}
      {!enviado && (
        <div style={infoBanner}>
          <strong>Orientações:</strong> marque cada resposta como correta ou errada e ajuste o XP se quiser.
          Nenhum ponto é enviado ainda - só ao clicar em <strong>"Confirmar e enviar XP"</strong> no final.
          Você pode editar à vontade antes de confirmar.
        </div>
      )}

      {/* Questões */}
      {questoes.length === 0 ? (
        <div style={card}><p style={{ color: "var(--texto-suave)" }}>Nenhuma questão aberta encontrada.</p></div>
      ) : (
        questoes.map((questao, qi) => {
          const respostasQuestao  = respostasPorQuestao[questao.id] || [];
          const marcadasQuestao   = respostasQuestao.filter(r => correcaoLocal[r.id]?.isCorrect !== null).length;
          const xpMax             = questao.xp ?? 10;

          return (
            <div key={questao.id} style={card}>
              {/* Cabeçalho da questão */}
              <div style={questaoHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={questaoNumStyle}>Questão {qi + 1}</span>
                  <span style={xpBadgeStyle}>
                    <TwemojiImg codepoint="26a1" size={14} alt="xp" /> {xpMax} XP máx.
                  </span>
                </div>
                <span style={corrigidasBadge(marcadasQuestao, respostasQuestao.length)}>
                  {marcadasQuestao}/{respostasQuestao.length} marcadas
                </span>
              </div>
              <p style={questaoTexto}>{questao.pergunta}</p>

              {respostasQuestao.length === 0 ? (
                <p style={{ color: "var(--texto-muito-suave)", fontSize: "13px" }}>
                  Nenhum aluno respondeu esta questão.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {respostasQuestao.map(resp => {
                    const nome    = nomes[resp.userId] || "Aluno";
                    const local   = correcaoLocal[resp.id] ?? { isCorrect: null, xp: xpMax, xpMax };
                    const marcada = local.isCorrect !== null;

                    return (
                      <div key={resp.id} style={respostaCard(local.isCorrect)}>
                        {/* Cabeçalho */}
                        <div style={respostaTop}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={alunoAvatar}>{nome.charAt(0).toUpperCase()}</span>
                            <div>
                              <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--texto)", display: "block" }}>
                                {nome}
                              </span>
                              {marcada && (
                                <span style={{
                                  fontSize: "11px", fontWeight: "bold",
                                  display: "block", marginTop: "2px",
                                  color: local.isCorrect ? "var(--cor-primaria)" : "var(--cor-perigo)",
                                }}>
                                  {local.isCorrect
                                    ? `Correto - ${local.xp} XP ${enviado ? "enviado" : "a enviar"}`
                                    : `Errado - 0 XP`
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botões de marcação - sempre visíveis enquanto não enviado */}
                          {!enviado && (
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                              <button
                                onClick={() => marcarLocal(resp.id, true)}
                                style={{
                                  ...btnCerto,
                                  opacity: local.isCorrect === true ? 1 : 0.45,
                                  outline: local.isCorrect === true ? "2px solid var(--cor-primaria)" : "none",
                                }}
                              >
                                Correto
                              </button>
                              <button
                                onClick={() => marcarLocal(resp.id, false)}
                                style={{
                                  ...btnErrado,
                                  opacity: local.isCorrect === false ? 1 : 0.45,
                                  outline: local.isCorrect === false ? "2px solid var(--cor-perigo)" : "none",
                                }}
                              >
                                Errado
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Texto da resposta */}
                        <div style={respostaTextoBox}>
                          <p style={{ margin: 0, fontSize: "14px", color: "var(--texto)", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {resp.respostaTexto}
                          </p>
                        </div>

                        {/* XP parcial - só aparece se marcado como correto e não enviado */}
                        {!enviado && local.isCorrect === true && (
                          <div style={xpInputRow}>
                            <label style={xpLabel}>XP a conceder:</label>
                            <input
                              type="number"
                              min="0"
                              max={xpMax}
                              value={local.xp}
                              onChange={e => setXpLocal(resp.id, e.target.value)}
                              style={xpInput}
                            />
                            <span style={{ fontSize: "12px", color: "var(--texto-muito-suave)" }}>
                              de {xpMax}
                            </span>
                          </div>
                        )}

                        {/* Data da resposta */}
                        {resp.answeredAt?.toDate && (
                          <p style={{ fontSize: "11px", color: "var(--texto-muito-suave)", marginTop: "8px", textAlign: "right" }}>
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
          );
        })
      )}

      {/* Botão de confirmar - fixo no rodapé */}
      {!enviado && (
        <div style={rodape}>
          <div style={{ fontSize: "14px", color: todasMarcadas ? "var(--cor-primaria)" : "var(--texto-suave)" }}>
            {todasMarcadas
              ? "Tudo marcado! Revise e confirme quando estiver pronto."
              : `Faltam ${totalRespostas - totalCorrigidas} resposta${totalRespostas - totalCorrigidas !== 1 ? "s" : ""} para marcar`
            }
          </div>
          <button
            onClick={handleConfirmar}
            disabled={enviando || !todasMarcadas}
            style={{
              ...btnConfirmar,
              opacity: (!todasMarcadas || enviando) ? 0.5 : 1,
              cursor: (!todasMarcadas || enviando) ? "default" : "pointer",
            }}
          >
            {enviando ? "Enviando..." : "Confirmar e enviar XP"}
          </button>
        </div>
      )}
    </div>
  );
}

/* Estilos */
const container = {
  minHeight: "100vh", background: "transparent",
  padding: "30px 30px 100px", maxWidth: "800px", margin: "0 auto",
};
const header = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  marginBottom: "24px", flexWrap: "wrap", gap: "12px",
};
const progressBox = {
  display: "flex", flexDirection: "column", alignItems: "center",
  background: "var(--bg-card)", borderRadius: "10px",
  padding: "12px 20px", boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
};
const progressNum = {
  fontSize: "24px", fontWeight: "bold",
  fontFamily: "'Fredoka One', sans-serif", color: "var(--cor-primaria)",
};
const progressLabel = { fontSize: "12px", color: "var(--texto-muito-suave)" };
const successBanner = {
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  borderRadius: "10px", padding: "14px 20px", marginBottom: "20px",
  fontWeight: "bold", fontSize: "14px", border: "1px solid var(--cor-primaria-borda)",
};
const infoBanner = {
  background: "var(--bg-card)", borderRadius: "10px",
  padding: "12px 16px", marginBottom: "20px",
  fontSize: "13px", color: "var(--texto-suave)", lineHeight: 1.6,
  border: "1px solid var(--borda)",
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
const questaoNumStyle = {
  fontSize: "12px", fontWeight: "bold", color: "var(--texto-muito-suave)",
  textTransform: "uppercase", letterSpacing: "0.5px",
};
const xpBadgeStyle = {
  fontSize: "12px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "2px 8px", borderRadius: "10px",
  display: "inline-flex", alignItems: "center", gap: "4px",
};
const corrigidasBadge = (done, total) => ({
  fontSize: "12px", fontWeight: "bold",
  background: done === total && total > 0 ? "var(--cor-primaria-claro)" : "var(--bg-input)",
  color: done === total && total > 0 ? "var(--cor-primaria-texto)" : "var(--texto-suave)",
  padding: "3px 10px", borderRadius: "10px", border: "1px solid var(--borda)",
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
const respostaTextoBox = {
  background: "var(--bg-card)", borderRadius: "8px",
  padding: "10px 14px", border: "1px solid var(--borda)",
};
const xpInputRow = {
  display: "flex", alignItems: "center", gap: "8px",
  marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--borda)",
};
const xpLabel = {
  fontSize: "13px", fontWeight: "600", color: "var(--texto-suave)", whiteSpace: "nowrap",
};
const xpInput = {
  width: "64px", padding: "5px 8px", borderRadius: "6px",
  border: "1px solid var(--borda)", background: "var(--bg-input)",
  color: "var(--texto)", fontSize: "15px", fontWeight: "bold",
  textAlign: "center", boxSizing: "border-box", fontFamily: "inherit",
};
const btnCerto = {
  padding: "7px 14px", borderRadius: "8px", border: "2px solid var(--cor-primaria)",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
  transition: "opacity 0.15s",
};
const btnErrado = {
  padding: "7px 14px", borderRadius: "8px", border: "2px solid var(--cor-perigo)",
  background: "var(--cor-perigo)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
  transition: "opacity 0.15s",
};
const rodape = {
  position: "fixed", bottom: 0, left: 0, right: 0,
  background: "var(--bg-card)", padding: "14px 24px",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  boxShadow: "0 -2px 12px var(--sombra)", borderTop: "1px solid var(--borda)",
  gap: "16px", flexWrap: "wrap",
};
const btnConfirmar = {
  padding: "12px 28px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff",
  fontWeight: "bold", fontSize: "15px", fontFamily: "inherit",
  transition: "opacity 0.2s",
};