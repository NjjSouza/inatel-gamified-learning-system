import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClasses } from "../hooks/useClasses";
import { useSessions } from "../hooks/useSessions";
import { useQuizzes } from "../hooks/useQuizzes";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import Spinner from "../components/Spinner";
import TwemojiImg from "../components/TwemojiImg";
import BackButton from "../components/BackButton";

// Níveis
const NIVEIS = [
  { label: "Pedra",    codepoint: "1faa8", min: 0    },
  { label: "Bronze",   codepoint: "1f949", min: 201  },
  { label: "Prata",    codepoint: "1f948", min: 401  },
  { label: "Ouro",     codepoint: "1f947", min: 601  },
  { label: "Platina",  codepoint: "1f52e", min: 801  },
  { label: "Diamante", codepoint: "1f48e", min: 1001 },
];

function getNivel(xp) {
  let nivel = NIVEIS[0];
  for (const n of NIVEIS) { if (xp >= n.min) nivel = n; }
  return nivel;
}

// Timer ativo 
function SessionTimer({ sessionId }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [sessionId]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <span style={timerText}>
      <TwemojiImg codepoint="23f1" size={18} alt="timer" />
      {" "}{mins}:{secs}
    </span>
  );
}

// Componente principal 
export default function ClassPageProfessor() {
  const { courseId, classId } = useParams();
  const navigate = useNavigate();

  const { getEnrollments, enrollByEmail, closeClass } = useClasses();
  const { createSession, startSession, finishSession,
          nextQuestion, listenPlayers, listenSessionsByClass,
          getOpenAnswersForSession } = useSessions();
  const { getQuizzes, getQuestions } = useQuizzes();

  const [classData, setClassData]   = useState(null);
  const [sessions, setSessions]     = useState([]);
  const [quizzes, setQuizzes]       = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questionsCount, setQuestionsCount]   = useState({});
  const [playersBySession, setPlayersBySession] = useState({});
  const [respondidosPorSessao, setRespondidosPorSessao] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [enrollEmail, setEnrollEmail] = useState("");
  const [expandedSession, setExpandedSession] = useState(null);
  const [quizTemAberta, setQuizTemAberta]     = useState({});
  const [pendentePorSessao, setPendentePorSessao] = useState({});

  // Ranking
  const [xpPorAluno, setXpPorAluno]   = useState({});  // { userId: number }
  const [ordenacao, setOrdenacao]     = useState("alfabetica"); // "alfabetica" | "ranking"

  // Histórico de respostas abertas
  const [expandedOpenSession, setExpandedOpenSession] = useState(null);
  const [openAnswersCache, setOpenAnswersCache]         = useState({}); // { sessionId: [] }
  const [nomesCache, setNomesCache]                     = useState({}); // { userId: nome }
  const [loadingOpenAnswers, setLoadingOpenAnswers]     = useState(false);

  const sessoesAtivas     = sessions.filter(s => s.status !== "finished");
  const historico         = sessions.filter(s => s.status === "finished");
  const historicoOrdenado = [...historico].sort(
    (a, b) => (b.finishedAt?.toDate?.() ?? 0) - (a.finishedAt?.toDate?.() ?? 0)
  );
  const sessoesComAberta  = historicoOrdenado.filter(s => quizTemAberta[s.quizId]);

  // Carga inicial
  useEffect(() => {
    const fetch = async () => {
      const d = await getDoc(doc(db, "classes", classId));
      if (d.exists()) setClassData({ id: d.id, ...d.data() });
      setEnrollments(await getEnrollments(classId));
      setQuizzes(await getQuizzes());
    };
    fetch();
  }, [classId]);

  useEffect(() => {
    const unsub = listenSessionsByClass(classId, setSessions);
    return () => unsub();
  }, [classId]);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts = {}, temAberta = {};
      for (const quiz of quizzes) {
        const qs = await getQuestions(quiz.id);
        counts[quiz.id]    = qs.length;
        temAberta[quiz.id] = qs.some(q => q.tipo === "aberta");
      }
      setQuestionsCount(counts);
      setQuizTemAberta(temAberta);
    };
    if (quizzes.length) fetchCounts();
  }, [quizzes]);

  useEffect(() => {
    const unsubs = sessions.map(s =>
      listenPlayers(s.id, players =>
        setPlayersBySession(prev => ({ ...prev, [s.id]: players }))
      )
    );
    return () => unsubs.forEach(u => u());
  }, [sessions]);

  useEffect(() => {
    const novoRespondidos = {};
    sessions.filter(s => s.status === "playing").forEach(s => {
      const players      = playersBySession[s.id] || [];
      const currentIndex = s.currentQuestionIndex ?? 0;
      novoRespondidos[s.id] = players.filter(
        p => p.answers && Object.prototype.hasOwnProperty.call(p.answers, String(currentIndex))
      ).length;
    });
    setRespondidosPorSessao(novoRespondidos);
  }, [sessions, playersBySession]);

  // Verifica se ainda há respostas abertas pendentes em cada sessão do histórico
  useEffect(() => {
    const sessoesConcluidas = sessions.filter(s => s.status === "finished");
    if (!sessoesConcluidas.length) return;
    const verificar = async () => {
      const novasPendencias = {};
      for (const s of sessoesConcluidas) {
        if (!quizTemAberta[s.quizId]) { novasPendencias[s.id] = false; continue; }
        const respostas = await getOpenAnswersForSession(s.id);
        novasPendencias[s.id] = respostas.some(r => r.isCorrect === null || r.isCorrect === undefined);
      }
      setPendentePorSessao(novasPendencias);
    };
    verificar();
  }, [sessions, quizTemAberta]);

  // XP por aluno (para ranking)
  useEffect(() => {
    if (!enrollments.length) return;
    const fetchXp = async () => {
      const xpSnap = await getDocs(query(
        collection(db, "xp"),
        where("classId", "==", classId)
      ));
      const mapa = {};
      xpSnap.docs.forEach(d => {
        const { userId, amount } = d.data();
        if (!userId) return;
        mapa[userId] = (mapa[userId] || 0) + (amount || 0);
      });
      setXpPorAluno(mapa);
    };
    fetchXp();
  }, [enrollments, classId]);

  // Abrir histórico de respostas abertas
  const handleExpandOpenSession = async (sessionId) => {
    if (expandedOpenSession === sessionId) {
      setExpandedOpenSession(null);
      return;
    }
    setExpandedOpenSession(sessionId);
    if (openAnswersCache[sessionId]) return; // já carregado

    setLoadingOpenAnswers(true);
    try {
      const respostas = await getOpenAnswersForSession(sessionId);

      // Busca questões do quiz para exibir o enunciado
      const sessao  = sessions.find(s => s.id === sessionId);
      const questoes = sessao ? await getQuestions(sessao.quizId) : [];
      const questoesMap = {};
      questoes.forEach(q => { questoesMap[q.id] = q; });

      // Busca nomes dos alunos
      const userIds = [...new Set(respostas.map(r => r.userId).filter(Boolean))];
      const novosNomes = { ...nomesCache };
      await Promise.all(userIds.map(async uid => {
        if (novosNomes[uid]) return;
        const snap = await getDoc(doc(db, "usuarios", uid));
        novosNomes[uid] = snap.exists() ? (snap.data().nome || snap.data().email) : uid;
      }));
      setNomesCache(novosNomes);

      // Agrupa por questão
      const porQuestao = {};
      respostas.forEach(r => {
        const key = r.questionId;
        if (!porQuestao[key]) porQuestao[key] = { questao: questoesMap[key], respostas: [] };
        porQuestao[key].respostas.push(r);
      });

      setOpenAnswersCache(prev => ({ ...prev, [sessionId]: { porQuestao, questoes } }));
    } finally {
      setLoadingOpenAnswers(false);
    }
  };

  // Handlers
  const handleCreateSession = async () => {
    if (!selectedQuiz) return alert("Selecione um quiz!");
    const session = await createSession(selectedQuiz.id, courseId, classId);
    alert(`Sessão criada! Código: ${session.pin}`);
    setSelectedQuiz(null);
  };

  const handleEnroll = async () => {
    if (!enrollEmail.trim()) return alert("Digite o e-mail");
    try {
      await enrollByEmail(classId, enrollEmail.trim());
      setEnrollEmail("");
      setEnrollments(await getEnrollments(classId));
      alert("Aluno matriculado!");
    } catch (e) { alert("Erro: " + e.message); }
  };

  // Alunos ordenados
  const alunosOrdenados = [...enrollments].sort((a, b) => {
    if (ordenacao === "ranking") {
      const xpA = xpPorAluno[a.userId] || 0;
      const xpB = xpPorAluno[b.userId] || 0;
      return xpB - xpA;
    }
    return (a.nome || a.email).localeCompare(b.nome || b.email, "pt-BR");
  });

  if (!classData) return <Spinner />;

  return (
    <div style={container}>
      <BackButton />
      <div style={header}>
        <h1>Turma {classData.semestre}</h1>
        <span style={{
          fontSize: "14px", fontWeight: "bold",
          color: classData.status === "active" ? "var(--cor-primaria)" : "var(--texto-muito-suave)",
        }}>
          {classData.status === "active" ? "● Ativa" : "Encerrada"}
        </span>
      </div>

      {/* Criar sessão */}
      {classData.status === "active" && (
        <div style={card}>
          <h2>Criar Sessão</h2>
          <p style={sectionLabel}>Selecione o quiz:</p>
          {quizzes.length === 0 ? (
            <p style={{ color: "var(--texto-suave)" }}>Você ainda não criou nenhum quiz.</p>
          ) : (
            quizzes.map(q => (
              <button
                key={q.id}
                onClick={() => setSelectedQuiz(prev => prev?.id === q.id ? null : q)}
                style={{
                  ...cardButton,
                  background: selectedQuiz?.id === q.id ? "var(--cor-primaria-claro)" : "var(--bg-input)",
                  borderColor: selectedQuiz?.id === q.id ? "var(--cor-primaria)" : "var(--borda)",
                }}
              >
                <span style={{ color: "var(--texto)" }}>{q.nome}</span>
                {quizTemAberta[q.id] && <span style={badgeAberta}>Contém questões abertas</span>}
              </button>
            ))
          )}
          {selectedQuiz && (
            <button onClick={handleCreateSession} style={{ ...buttonPrimary, marginTop: "15px" }}>
              Criar Sessão
            </button>
          )}
        </div>
      )}

      {/* Sessões ativas */}
      <div style={card}>
        <h2>Sessões Ativas</h2>
        {sessoesAtivas.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhuma sessão ativa no momento.</p>
        ) : (
          sessoesAtivas.map(s => {
            const players     = playersBySession[s.id] || [];
            const respondidos = respondidosPorSessao[s.id] || 0;
            return (
              <div key={s.id} style={sessionCard}>
                {s.status === "waiting" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontWeight: "bold", fontSize: "13px", color: "var(--cor-primaria)", margin: 0 }}>
                        Código: {s.pin}
                      </p>
                      <p style={{ fontSize: "13px", color: "var(--texto-suave)", margin: "4px 0 0" }}>
                        Aguardando ({players.length} na sala)
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                      <button onClick={() => { navigator.clipboard.writeText(s.pin); alert("Código copiado!"); }} style={buttonSecondary}>
                        Copiar código
                      </button>
                      <button onClick={async () => { await startSession(s.id); navigate(`/professor/sessao/${s.id}`); }} style={buttonPrimary}>
                        Iniciar
                      </button>
                    </div>
                  </div>
                )}
                {s.status === "playing" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <SessionTimer sessionId={s.id} />
                    <button onClick={() => navigate(`/professor/sessao/${s.id}`)} style={buttonPrimary}>
                      Ver sessão ao vivo
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Histórico de sessões */}
      {historico.length > 0 && (
        <div style={card}>
          <h2>Histórico de Sessões</h2>
          {historicoOrdenado.map(s => {
            const quiz        = quizzes.find(q => q.id === s.quizId);
            const isExpanded  = expandedSession === s.id;
            const presentes   = s.totalPresentes ?? null;
            const matriculados = s.totalMatriculados ?? null;
            const presencaPct = presentes != null && matriculados > 0
              ? Math.round((presentes / matriculados) * 100) : null;
            const temPendente = pendentePorSessao[s.id];

            return (
              <div key={s.id} style={sessionCard}>
                <button onClick={() => setExpandedSession(isExpanded ? null : s.id)} style={historicoButton}>
                  <div style={{ textAlign: "left" }}>
                    <strong style={{ color: "var(--texto)" }}>{quiz?.nome || "Quiz"}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--texto-suave)" }}>
                      {s.finishedAt?.toDate
                        ? s.finishedAt.toDate().toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                      {s.classeSemestre ? ` · ${s.classeSemestre}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={percentualBadge(s.percentualGeral)}>
                      {s.percentualGeral ?? "—"}% de acerto
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--texto-muito-suave)" }}>
                      {isExpanded ? "▲ ocultar" : "▼ detalhes"}
                    </p>
                  </div>
                </button>

                {/* Botão de correção de questões abertas */}
                {temPendente && (
                  <div style={corrigirRow}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "13px", color: "var(--cor-aviso)", fontWeight: "600" }}>
                        Respostas abertas aguardam correção
                      </span>
                      {(() => {
                        const expireAt = s.expireAt?.toDate?.();
                        if (!expireAt) return null;
                        const diasRestantes = Math.ceil((expireAt - new Date()) / (1000 * 60 * 60 * 24));
                        if (diasRestantes > 7) return null;
                        return (
                          <span style={{
                            fontSize: "12px", fontWeight: "bold",
                            color: diasRestantes <= 3 ? "var(--cor-perigo)" : "var(--cor-aviso)",
                          }}>
                            ⚠ Expira em {diasRestantes} dia{diasRestantes !== 1 ? "s" : ""} — corrija antes que os alunos percam o XP!
                          </span>
                        );
                      })()}
                    </div>
                    <button onClick={() => navigate(`/professor/sessao/${s.id}/corrigir`)} style={buttonCorrigir}>
                      Corrigir respostas
                    </button>
                  </div>
                )}

                {/* Presença */}
                {presentes != null && (
                  <div style={presencaRow}>
                    <div style={presencaItem}>
                      <span style={presencaNumero}>{presentes}</span>
                      <span style={presencaLabel}>
                        {matriculados > 0 ? `de ${matriculados} presentes` : "presentes"}
                      </span>
                    </div>
                    {presencaPct != null && (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={barraFundo}>
                          <div style={barraPreenchida(presencaPct)} />
                        </div>
                        <span style={presencaPctLabel(presencaPct)}>
                          {presencaPct}% de presença
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && s.acertosPorQuestao && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ fontSize: "12px", color: "var(--texto-muito-suave)", marginBottom: "8px", textAlign: "left" }}>
                      Acerto por questão (entre os presentes):
                    </p>
                    {s.acertosPorQuestao.map((q, i) => (
                      <div key={q.questionId} style={questaoRow}>
                        <span style={{ fontSize: "13px", flex: 1, color: "var(--texto)", textAlign: "left" }}>
                          {i + 1}. {q.pergunta}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={barraFundo}>
                            <div style={barraPreenchida(q.percentual)} />
                          </div>
                          <span style={{
                            fontSize: "13px", fontWeight: "bold", minWidth: "40px", textAlign: "right",
                            color: q.percentual >= 70 ? "var(--cor-primaria)"
                              : q.percentual >= 40 ? "var(--cor-alerta)" : "var(--cor-perigo)",
                          }}>
                            {q.percentual}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Histórico de respostas abertas */}
      {sessoesComAberta.length > 0 && (
        <div style={card}>
          <h2>Respostas de Questões Abertas</h2>
          <p style={{ fontSize: "13px", color: "var(--texto-suave)", marginBottom: "16px" }}>
            Expanda uma sessão para ver as respostas e correções dos alunos.
          </p>

          {sessoesComAberta.map(s => {
            const quiz       = quizzes.find(q => q.id === s.quizId);
            const isExpanded = expandedOpenSession === s.id;
            const cache      = openAnswersCache[s.id];
            const temPendente = pendentePorSessao[s.id];

            return (
              <div key={s.id} style={sessionCard}>
                <button onClick={() => handleExpandOpenSession(s.id)} style={historicoButton}>
                  <div style={{ textAlign: "left" }}>
                    <strong style={{ color: "var(--texto)" }}>{quiz?.nome || "Quiz"}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--texto-suave)" }}>
                      {s.finishedAt?.toDate
                        ? s.finishedAt.toDate().toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {temPendente && (
                      <span style={badgePendente}>pendente</span>
                    )}
                    <span style={{ fontSize: "12px", color: "var(--texto-muito-suave)" }}>
                      {isExpanded ? "▲ fechar" : "▼ ver respostas"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ marginTop: "16px" }}>
                    {loadingOpenAnswers && !cache ? (
                      <p style={{ color: "var(--texto-suave)", fontSize: "13px" }}>Carregando...</p>
                    ) : !cache || Object.keys(cache.porQuestao).length === 0 ? (
                      <p style={{ color: "var(--texto-suave)", fontSize: "13px" }}>
                        Nenhuma resposta registrada nesta sessão.
                      </p>
                    ) : (
                      Object.entries(cache.porQuestao).map(([qId, { questao, respostas }], qi) => (
                        <div key={qId} style={questaoAbertaBloco}>
                          {/* Enunciado */}
                          <div style={questaoAbertaHeader}>
                            <span style={questaoNum}>Questão aberta {qi + 1}</span>
                            {questao && (
                              <span style={xpBadge}>
                                ⚡ {questao.xp ?? 10} XP
                              </span>
                            )}
                          </div>
                          <p style={questaoTexto}>
                            {questao?.pergunta || "Questão removida"}
                          </p>

                          {/* Respostas dos alunos */}
                          {respostas.map(resp => {
                            const nome = nomesCache[resp.userId] || "Aluno";
                            const corrigida = resp.isCorrect !== null && resp.isCorrect !== undefined;
                            return (
                              <div key={resp.id} style={respostaBloco(resp.isCorrect)}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={alunoAvatar}>{nome.charAt(0).toUpperCase()}</span>
                                    <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--texto)" }}>
                                      {nome}
                                    </span>
                                  </div>
                                  {corrigida ? (
                                    <span style={{
                                      fontSize: "12px", fontWeight: "bold",
                                      color: resp.isCorrect ? "var(--cor-primaria)" : "var(--cor-perigo)",
                                    }}>
                                      {resp.isCorrect ? `Correto · +${resp.xp} XP` : "✗ Errado"}
                                    </span>
                                  ) : (
                                    <span style={badgePendente}>aguardando correção</span>
                                  )}
                                </div>
                                <div style={respostaTextoBox}>
                                  <p style={{ margin: 0, fontSize: "14px", color: "var(--texto)", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {resp.respostaTexto}
                                  </p>
                                </div>
                                {resp.answeredAt?.toDate && (
                                  <p style={{ fontSize: "11px", color: "var(--texto-muito-suave)", marginTop: "6px", textAlign: "right" }}>
                                    Respondido em {resp.answeredAt.toDate().toLocaleString("pt-BR", {
                                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                    })}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}

                    {/* Botão para ir para a correção, se houver pendentes */}
                    {temPendente && (
                      <button
                        onClick={() => navigate(`/professor/sessao/${s.id}/corrigir`)}
                        style={{ ...buttonCorrigir, marginTop: "12px" }}
                      >
                        Ir para correção
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Alunos matriculados com XP e ranking */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ margin: 0 }}>Alunos Matriculados</h2>
          {enrollments.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "13px", color: "var(--texto-suave)", whiteSpace: "nowrap" }}>
                Ordenar por:
              </label>
              <select
                value={ordenacao}
                onChange={e => setOrdenacao(e.target.value)}
                style={selectStyle}
              >
                <option value="alfabetica">A → Z</option>
                <option value="ranking">Ranking (XP)</option>
              </select>
            </div>
          )}
        </div>

        {classData.status === "active" && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", justifyContent: "center" }}>
            <input
              placeholder="E-mail do aluno"
              value={enrollEmail}
              onChange={e => setEnrollEmail(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={handleEnroll} style={buttonPrimary}>Adicionar aluno</button>
          </div>
        )}

        {alunosOrdenados.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>Nenhum aluno cadastrado nesta turma ainda.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {ordenacao === "ranking" && <th style={thStyle}>#</th>}
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Nível</th>
                <th style={thStyle}>XP</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {alunosOrdenados.map((e, i) => {
                const xp    = e.userId ? (xpPorAluno[e.userId] || 0) : null;
                const nivel = xp !== null ? getNivel(xp) : null;
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--borda)" }}>
                    {ordenacao === "ranking" && (
                      <td style={{ ...tdStyle, fontWeight: "bold", color: "var(--texto-muito-suave)", fontSize: "13px" }}>
                        {i + 1}º
                      </td>
                    )}
                    <td style={tdStyle}>{e.nome || "—"}</td>
                    <td style={{ ...tdStyle, fontSize: "13px", color: "var(--texto-suave)" }}>{e.email}</td>
                    <td style={tdStyle}>
                      {nivel ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <TwemojiImg codepoint={nivel.codepoint} size={18} alt={nivel.label} />
                          <span style={{ fontSize: "12px", color: "var(--texto-suave)" }}>{nivel.label}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--texto-muito-suave)" }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {xp !== null ? (
                        <span style={xpBadge}>{xp} XP</span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--texto-muito-suave)" }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        color: e.userId ? "var(--cor-primaria)" : "var(--cor-alerta)",
                        fontSize: "12px", fontWeight: "bold",
                      }}>
                        {e.userId ? "Cadastrado" : "Aguardando cadastro"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {classData.status === "active" && (
          <button
            onClick={() => closeClass(classId).then(() =>
              setClassData(prev => ({ ...prev, status: "closed" }))
            )}
            style={{ ...buttonPerigo, marginTop: "20px" }}
          >
            Encerrar turma
          </button>
        )}
      </div>
    </div>
  );
}

/* Estilos */
const container = { minHeight: "100vh", background: "transparent", padding: "30px" };
const header    = { textAlign: "center", marginBottom: "30px" };
const card = {
  maxWidth: "700px", margin: "0 auto 30px auto", padding: "20px",
  background: "var(--bg-card)", borderRadius: "12px",
  boxShadow: "var(--sombra-card)", border: "1px solid var(--borda)",
  textAlign: "center",
};
const sectionLabel = { fontWeight: "bold", textAlign: "center", marginBottom: "8px", color: "var(--texto)" };
const sessionCard  = {
  border: "1px solid var(--borda)", borderRadius: "10px",
  padding: "15px", marginBottom: "15px", textAlign: "left",
  background: "var(--bg-input)",
};
const inputStyle = {
  padding: "8px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)", fontSize: "14px",
};
const selectStyle = {
  padding: "6px 10px", borderRadius: "6px",
  border: "1px solid var(--borda)",
  background: "var(--bg-input)", color: "var(--texto)",
  fontSize: "13px", cursor: "pointer",
};
const buttonPrimary = {
  padding: "10px 15px", borderRadius: "8px", border: "none",
  background: "var(--cor-primaria)", color: "#fff", cursor: "pointer", fontWeight: "bold",
};
const buttonSecondary = {
  padding: "8px 12px", borderRadius: "8px",
  border: "1px solid var(--borda)",
  background: "var(--bg-card)", color: "var(--texto)", cursor: "pointer",
};
const buttonPerigo = {
  padding: "8px 12px", borderRadius: "8px", border: "none",
  background: "var(--cor-perigo)", color: "#fff", cursor: "pointer", fontWeight: "bold",
};
const buttonCorrigir = {
  padding: "7px 14px", borderRadius: "8px", border: "none",
  background: "var(--cor-aviso)", color: "#fff",
  fontWeight: "bold", fontSize: "13px", cursor: "pointer",
};
const cardButton = {
  width: "100%", padding: "10px 14px", marginBottom: "10px",
  borderRadius: "8px", border: "1px solid var(--borda)", cursor: "pointer",
  transition: "background 0.15s", display: "flex",
  justifyContent: "space-between", alignItems: "center",
};
const thStyle = {
  padding: "8px", fontSize: "12px", color: "var(--texto-muito-suave)",
  borderBottom: "2px solid var(--borda)", textAlign: "center",
};
const tdStyle = { padding: "10px 8px", fontSize: "14px", textAlign: "center", color: "var(--texto)" };
const historicoButton = {
  width: "100%", display: "flex", justifyContent: "space-between",
  alignItems: "center", background: "none", border: "none",
  cursor: "pointer", padding: 0, color: "var(--texto)",
};
const percentualBadge = (pct) => ({
  display: "inline-block", padding: "4px 10px", borderRadius: "20px",
  fontSize: "13px", fontWeight: "bold",
  background: pct >= 70 ? "var(--cor-primaria-claro)" : pct >= 40 ? "var(--cor-alerta-claro)" : "var(--cor-perigo-claro)",
  color: pct >= 70 ? "var(--cor-primaria-texto)" : pct >= 40 ? "var(--cor-aviso)" : "var(--cor-perigo)",
});
const questaoRow = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: "12px", padding: "8px 0", borderBottom: "1px solid var(--borda)",
};
const barraFundo = { width: "80px", height: "8px", background: "var(--borda)", borderRadius: "4px", overflow: "hidden" };
const barraPreenchida = (pct) => ({
  height: "100%", borderRadius: "4px", width: `${pct}%`,
  background: pct >= 70 ? "var(--cor-primaria)" : pct >= 40 ? "var(--cor-alerta)" : "var(--cor-perigo)",
});
const timerText = {
  fontSize: "18px", fontWeight: "bold", color: "var(--cor-primaria)",
  fontFamily: "'Fredoka One', sans-serif",
  display: "inline-flex", alignItems: "center", gap: "5px",
};
const presencaRow = {
  display: "flex", alignItems: "center", gap: "16px",
  marginTop: "10px", padding: "10px 0 4px", borderTop: "1px solid var(--borda)",
};
const presencaItem = { display: "flex", flexDirection: "column", alignItems: "center", minWidth: "56px" };
const presencaNumero = {
  fontSize: "22px", fontWeight: "bold", color: "var(--texto)",
  fontFamily: "'Fredoka One', sans-serif", lineHeight: 1,
};
const presencaLabel    = { fontSize: "11px", color: "var(--texto-muito-suave)", marginTop: "2px" };
const presencaPctLabel = (pct) => ({
  fontSize: "12px", fontWeight: "bold",
  color: pct >= 70 ? "var(--cor-primaria)" : pct >= 40 ? "var(--cor-alerta)" : "var(--cor-perigo)",
});
const badgeAberta = {
  fontSize: "11px", padding: "2px 8px", borderRadius: "10px",
  background: "var(--cor-aviso-claro)", color: "var(--cor-aviso)", fontWeight: "bold",
};
const badgePendente = {
  fontSize: "11px", padding: "2px 8px", borderRadius: "10px",
  background: "var(--cor-aviso-claro)", color: "var(--cor-aviso)",
  fontWeight: "bold", border: "1px solid var(--cor-aviso-borda)",
};
const corrigirRow = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginTop: "10px", padding: "10px 12px",
  background: "var(--cor-aviso-claro)", borderRadius: "8px",
  border: "1px solid var(--cor-aviso-borda)", gap: "10px", flexWrap: "wrap",
};

// Seção de respostas abertas
const questaoAbertaBloco = {
  marginBottom: "20px", paddingBottom: "20px",
  borderBottom: "1px solid var(--borda)",
};
const questaoAbertaHeader = {
  display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px",
};
const questaoNum = {
  fontSize: "11px", fontWeight: "bold", color: "var(--texto-muito-suave)",
  textTransform: "uppercase", letterSpacing: "0.5px",
};
const questaoTexto = {
  fontSize: "15px", fontWeight: "600", color: "var(--texto)",
  margin: "0 0 12px", lineHeight: 1.4,
};
const respostaBloco = (isCorrect) => ({
  border: `1px solid ${
    isCorrect === true  ? "var(--cor-primaria)"
    : isCorrect === false ? "var(--cor-perigo)"
    : "var(--borda)"
  }`,
  borderRadius: "8px", padding: "12px", marginBottom: "10px",
  background: isCorrect === true  ? "var(--cor-primaria-claro)"
            : isCorrect === false ? "var(--cor-perigo-claro)"
            : "var(--bg)",
});
const alunoAvatar = {
  width: "30px", height: "30px", borderRadius: "50%",
  background: "var(--cor-primaria)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "13px", fontWeight: "bold", flexShrink: 0,
};
const respostaTextoBox = {
  background: "var(--bg-card)", borderRadius: "6px",
  padding: "8px 12px", border: "1px solid var(--borda)",
};
const xpBadge = {
  fontSize: "12px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)", color: "var(--cor-primaria-texto)",
  padding: "2px 8px", borderRadius: "10px",
  display: "inline-flex", alignItems: "center", gap: "3px",
};