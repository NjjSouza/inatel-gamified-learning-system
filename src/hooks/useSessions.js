import { db } from "../services/firebase";
import {
  collection, doc, addDoc, updateDoc, query, where,
  onSnapshot, getDoc, getDocs, setDoc, increment, deleteDoc, arrayUnion
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useQuizzes } from "./useQuizzes";

const SESSION_TTL_DAYS  = 30;
const XP_PRESENCA       = 10; // XP e moedas fixos por entrar na sessão

export function useSessions() {
  const { user } = useAuth();
  const { getQuestions } = useQuizzes();

  const createSession = async (quizId, courseId, classId) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!quizId || !courseId || !classId) throw new Error("Dados inválidos");

    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const classSnap = await getDoc(doc(db, "classes", classId));
    const classeSemestre = classSnap.exists() ? classSnap.data().semestre : "";

    const docRef = await addDoc(collection(db, "sessions"), {
      professorId: user.uid,
      quizId,
      courseId,
      classId,
      classeSemestre,
      pin,
      status: "waiting",
      currentQuestionIndex: 0,
      createdAt: new Date(),
    });

    return { id: docRef.id, pin };
  };

  const getSessionByPin = async (pin) => {
    const q = query(collection(db, "sessions"), where("pin", "==", pin));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  };

  /**
   * Entra na sessão e concede XP + moedas de presença (sincronizados).
   * Idempotente: se o aluno já entrou, não cria duplicata nem concede novamente.
   */
  const joinSession = async (sessionId) => {
    if (!user) return;

    // Verifica se já entrou
    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId),
      where("userId", "==", user.uid)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;

    const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
    const classId = sessionSnap.exists() ? sessionSnap.data().classId : null;

    // Cria o jogador
    await addDoc(collection(db, "session_players"), {
      sessionId,
      userId: user.uid,
      nome: user.nome || user.email,
      score: 0,
      answers: {},
    });

    if (classId) {
      // XP de presença
      await addDoc(collection(db, "xp"), {
        userId: user.uid,
        classId,
        amount: XP_PRESENCA,
        reason: "presence",
        sessionId,
        createdAt: new Date(),
      });

      // Moedas de presença - mesmo valor do XP
      await addDoc(collection(db, "coins"), {
        userId: user.uid,
        classId,
        amount: XP_PRESENCA,
        reason: "presence",
        sessionId,
        createdAt: new Date(),
      });

      // Saldo de moedas
      await setDoc(
        doc(db, "coin_balance", `${user.uid}_${classId}`),
        {
          userId: user.uid,
          classId,
          balance: increment(XP_PRESENCA),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }
  };

  const listenPlayers = (sessionId, callback) => {
    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId)
    );
    return onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(players);
    });
  };

  const getSessions = async () => {
    if (!user) return [];
    const q = query(collection(db, "sessions"), where("professorId", "==", user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const getSessionsByCourse = async (courseId) => {
    const q = query(collection(db, "sessions"), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const listenSessionsByCourse = (courseId, callback) => {
    const q = query(collection(db, "sessions"), where("courseId", "==", courseId));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(sessions);
    });
  };

  const listenSessionsByClass = (classId, callback) => {
    const q = query(collection(db, "sessions"), where("classId", "==", classId));
    return onSnapshot(q, async (snapshot) => {
      const agora = new Date();
      const sessions = [];

      for (const d of snapshot.docs) {
        const data = d.data();
        const expireAt = data.expireAt?.toDate ? data.expireAt.toDate() : null;

        if (expireAt && expireAt < agora) {
          deleteDoc(d.ref).catch(() => {});
        } else {
          sessions.push({ id: d.id, ...data });
        }
      }

      callback(sessions);
    });
  };

  const startSession = async (sessionId) => {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "playing",
      currentQuestionIndex: 0,
    });
  };

  const finishSession = async (sessionId, quizId) => {
    const answersSnap = await getDocs(query(
      collection(db, "session_answers"),
      where("sessionId", "==", sessionId)
    ));
    // Apenas respostas fechadas para o percentual geral
    const respostas = answersSnap.docs.map(d => d.data()).filter(r => r.tipo !== "aberta");

    const playersSnap = await getDocs(query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId)
    ));
    const totalPresentes = playersSnap.size;

    const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
    const classId = sessionSnap.data()?.classId;

    let totalMatriculados = 0;
    if (classId) {
      const enrollSnap = await getDocs(query(
        collection(db, "enrollments"),
        where("classId", "==", classId),
      ));
      totalMatriculados = enrollSnap.size;
    }

    const total    = respostas.length;
    const acertos  = respostas.filter(r => r.isCorrect).length;
    const percentualGeral = total > 0 ? Math.round((acertos / total) * 100) : 0;

    const porQuestao = {};
    respostas.forEach(r => {
      if (!porQuestao[r.questionId]) porQuestao[r.questionId] = { acertos: 0, total: 0 };
      porQuestao[r.questionId].total += 1;
      if (r.isCorrect) porQuestao[r.questionId].acertos += 1;
    });

    const questoesSnap = await getDocs(collection(db, "quizzes", quizId, "questions"));
    const questoesMap = {};
    questoesSnap.docs.forEach(d => { questoesMap[d.id] = d.data().pergunta; });

    const acertosPorQuestao = Object.entries(porQuestao).map(([qId, dados]) => ({
      questionId: qId,
      pergunta: questoesMap[qId] || "Questão removida",
      percentual: Math.round((dados.acertos / dados.total) * 100),
      acertos: dados.acertos,
      total: dados.total,
    }));

    const expireAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await updateDoc(doc(db, "sessions", sessionId), {
      status: "finished",
      percentualGeral,
      acertosPorQuestao,
      totalPresentes,
      totalMatriculados,
      finishedAt: new Date(),
      expireAt,
    });
  };

  const nextQuestion = async (sessionId, currentIndex, totalQuestions) => {
    if (currentIndex + 1 >= totalQuestions) {
      console.warn("Última pergunta atingida");
      return;
    }
    await updateDoc(doc(db, "sessions", sessionId), {
      currentQuestionIndex: currentIndex + 1,
    });
  };

  /**
   * Resposta de múltipla escolha.
   * XP e moedas sempre com o mesmo valor (xpAmount se correto, 0 se errado).
   */
  const submitAnswer = async (
    playerId, sessionId, questionId, questionIndex,
    answerIndex, isCorrect, userId, classId, xpAmount = 10
  ) => {
    const xpGanho = isCorrect ? xpAmount : 0;

    await addDoc(collection(db, "session_answers"), {
      sessionId, questionId, userId, answerIndex, isCorrect,
      tipo: "multipla",
      xp: xpGanho,
      answeredAt: new Date(),
    });

    // Atualiza score no placar ao vivo
    const playerRef = doc(db, "session_players", playerId);
    await updateDoc(playerRef, {
      [`answers.${questionIndex}`]: answerIndex,
      score: increment(xpGanho),
    });

    if (isCorrect && userId && classId) {
      // XP
      await addDoc(collection(db, "xp"), {
        userId, classId, amount: xpGanho,
        reason: "correct_answer", sessionId, questionId,
        createdAt: new Date(),
      });

      // Moedas - mesmo valor do XP
      await addDoc(collection(db, "coins"), {
        userId, classId, amount: xpGanho,
        reason: "correct_answer", sessionId, questionId,
        createdAt: new Date(),
      });

      // Saldo de moedas
      await setDoc(
        doc(db, "coin_balance", `${userId}_${classId}`),
        {
          userId, classId,
          balance: increment(xpGanho),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    return isCorrect;
  };

  /**
   * Resposta de questão aberta (sem XP/moedas ainda - aguarda correção do professor).
   */
  const submitOpenAnswer = async (
    playerId, sessionId, questionId, questionIndex,
    respostaTexto, userId, classId
  ) => {
    await addDoc(collection(db, "session_answers"), {
      sessionId, questionId, userId, classId,
      respostaTexto,
      tipo: "aberta",
      isCorrect: null,
      xp: 0,
      answeredAt: new Date(),
    });

    const playerRef = doc(db, "session_players", playerId);
    await updateDoc(playerRef, {
      [`answers.${questionIndex}`]: "aberta_enviada",
    });
  };

  /**
   * Correção manual de uma questão aberta (chamada em lote por gradeOpenAnswersBatch).
   * Concede XP + moedas sincronizados se correto.
   */
  const gradeOpenAnswer = async (
    answerId, isCorrect, userId, classId, sessionId, questionId, xpAmount = 10
  ) => {
    const answerRef = doc(db, "session_answers", answerId);
    const xpGanho   = isCorrect ? xpAmount : 0;

    await updateDoc(answerRef, {
      isCorrect,
      xp: xpGanho,
      gradedAt: new Date(),
    });

    if (isCorrect && userId && classId) {
      // XP
      await addDoc(collection(db, "xp"), {
        userId, classId, amount: xpGanho,
        reason: "open_answer_graded", sessionId, questionId,
        createdAt: new Date(),
      });

      // Moedas - mesmo valor do XP
      await addDoc(collection(db, "coins"), {
        userId, classId, amount: xpGanho,
        reason: "open_answer_graded", sessionId, questionId,
        createdAt: new Date(),
      });

      // Saldo de moedas
      await setDoc(
        doc(db, "coin_balance", `${userId}_${classId}`),
        {
          userId, classId,
          balance: increment(xpGanho),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }
  };

  /**
   * Corrige um lote de respostas abertas de uma sessão de uma vez.
   * Usado pela página CorrectOpenAnswers para envio atômico.
   */
  const gradeOpenAnswersBatch = async (correcoes, sessionId) => {
    // Corrige todas as respostas
    await Promise.all(
      correcoes.map(({ answerId, isCorrect, xpAmount, userId, classId, questionId }) =>
        gradeOpenAnswer(answerId, isCorrect, userId, classId, sessionId, questionId, xpAmount)
      )
    );

    // Recalcula percentualGeral e acertosPorQuestao incluindo abertas corrigidas
    const sessSnap = await getDoc(doc(db, "sessions", sessionId));
    if (!sessSnap.exists()) return;
    const { quizId } = sessSnap.data();

    const allAnswersSnap = await getDocs(query(
      collection(db, "session_answers"),
      where("sessionId", "==", sessionId)
    ));

    // Só conta respostas já corrigidas (multipla escolha + abertas agora corrigidas)
    const todasGraded = allAnswersSnap.docs
      .map(d => d.data())
      .filter(r => r.isCorrect !== null && r.isCorrect !== undefined);

    const total = todasGraded.length;
    const acertos = todasGraded.filter(r => r.isCorrect).length;
    const percentualGeral = total > 0 ? Math.round((acertos / total) * 100) : 0;

    const porQuestao = {};
    todasGraded.forEach(r => {
      if (!porQuestao[r.questionId]) porQuestao[r.questionId] = { acertos: 0, total: 0 };
      porQuestao[r.questionId].total++;
      if (r.isCorrect) porQuestao[r.questionId].acertos++;
    });

    const questoesSnap = await getDocs(collection(db, "quizzes", quizId, "questions"));
    const questoesMap = {};
    questoesSnap.docs.forEach(d => { questoesMap[d.id] = d.data().pergunta; });

    const acertosPorQuestao = Object.entries(porQuestao).map(([qId, dados]) => ({
      questionId: qId,
      pergunta: questoesMap[qId] || "Questão removida",
      percentual: Math.round((dados.acertos / dados.total) * 100),
      acertos: dados.acertos,
      total: dados.total,
    }));

    await updateDoc(doc(db, "sessions", sessionId), {
      percentualGeral,
      acertosPorQuestao,
    });
  };

  // Busca respostas abertas de uma sessão para o professor corrigir
  const getOpenAnswersForSession = async (sessionId) => {
    const snap = await getDocs(query(
      collection(db, "session_answers"),
      where("sessionId", "==", sessionId),
      where("tipo", "==", "aberta")
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  // Gera/renova o token de check-in (chamada pelo professor)
const refreshCheckinToken = async (sessionId) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30_000);
  await updateDoc(doc(db, "sessions", sessionId), {
    checkinToken: token,
    checkinTokenExpiresAt: expiresAt,
    checkinTokenUsedBy: [], // reseta os "já usaram" a cada ciclo
  });
};

// Valida e consome o token (chamada pelo aluno)
const joinSessionWithToken = async (sessionId, token) => {
  const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
  const data = sessionSnap.data();

  const agora = new Date();
  const expira = data.checkinTokenExpiresAt?.toDate?.();

  if (data.checkinToken !== token)       throw new Error("QR Code inválido.");
  if (!expira || agora > expira)         throw new Error("QR Code expirado. Escaneie o atual.");
  if (data.checkinTokenUsedBy?.includes(user.uid))
                                         throw new Error("Você já registrou presença.");
  if (data.status === "finished")        throw new Error("Esta sessão já foi encerrada.");

  // Marca como usado antes de joinSession (evita corrida)
  await updateDoc(doc(db, "sessions", sessionId), {
    checkinTokenUsedBy: arrayUnion(user.uid),
  });

  await joinSession(sessionId);
};

  return {
    createSession,
    getSessionByPin,
    joinSession,
    listenPlayers,
    getSessions,
    getSessionsByCourse,
    listenSessionsByCourse,
    listenSessionsByClass,
    startSession,
    finishSession,
    nextQuestion,
    submitAnswer,
    submitOpenAnswer,
    gradeOpenAnswer,
    gradeOpenAnswersBatch,
    getOpenAnswersForSession,
    refreshCheckinToken,
    joinSessionWithToken,
  };
}