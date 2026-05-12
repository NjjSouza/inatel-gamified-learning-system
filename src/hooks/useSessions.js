import { db } from "../services/firebase";
import {
  collection, doc, addDoc, updateDoc, query, where,
  onSnapshot, getDoc, getDocs, setDoc, increment, deleteDoc
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useQuizzes } from "./useQuizzes";

const SESSION_TTL_DAYS = 30;

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

  const joinSession = async (sessionId) => {
    if (!user) return;

    const q = query(
      collection(db, "session_players"),
      where("sessionId", "==", sessionId),
      where("userId", "==", user.uid)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;

    await addDoc(collection(db, "session_players"), {
      sessionId,
      userId: user.uid,
      nome: user.nome || user.email,
      score: 0,
      answers: {},
    });
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
    // Inclui apenas respostas de questões fechadas (múltipla escolha) para o percentual
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

    const total = respostas.length;
    const acertos = respostas.filter(r => r.isCorrect).length;
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

  // Resposta de múltipla escolha - XP concedido na hora
  const submitAnswer = async (playerId, sessionId, questionId, questionIndex, answerIndex, isCorrect, userId, classId, xpAmount = 10) => {
    const xpGanho = isCorrect ? xpAmount : 0;

    await addDoc(collection(db, "session_answers"), {
      sessionId, questionId, userId, answerIndex, isCorrect,
      tipo: "multipla",
      xp: xpGanho,
      answeredAt: new Date(),
    });

    const playerRef = doc(db, "session_players", playerId);
    await updateDoc(playerRef, {
      [`answers.${questionIndex}`]: answerIndex,
      score: isCorrect ? increment(xpGanho) : increment(0),
    });

    if (isCorrect && userId && classId) {
      await addDoc(collection(db, "xp"), {
        userId, classId, amount: xpGanho,
        reason: "correct_answer", sessionId, questionId,
        createdAt: new Date(),
      });

      await addDoc(collection(db, "coins"), {
        userId, classId, amount: 0,
        reason: "correct_answer", sessionId, questionId,
        createdAt: new Date(),
      });

      await setDoc(
        doc(db, "coin_balance", `${userId}_${classId}`),
        { userId, classId, balance: increment(0), updatedAt: new Date() },
        { merge: true }
      );
    }

    return isCorrect;
  };

  // Resposta de questão aberta - salva o texto, sem XP imediato
  const submitOpenAnswer = async (playerId, sessionId, questionId, questionIndex, respostaTexto, userId, classId) => {
    await addDoc(collection(db, "session_answers"), {
      sessionId, questionId, userId, classId,
      respostaTexto,
      tipo: "aberta",
      isCorrect: null, // correção pendente
      xp: 0,
      answeredAt: new Date(),
    });

    // Marca a questão como "respondida" no placar do jogador (sem score)
    const playerRef = doc(db, "session_players", playerId);
    await updateDoc(playerRef, {
      [`answers.${questionIndex}`]: "aberta_enviada",
    });
  };

  // Correção manual de questão aberta pelo professor
  const gradeOpenAnswer = async (answerId, isCorrect, userId, classId, sessionId, questionId, xpAmount = 10) => {
    const answerRef = doc(db, "session_answers", answerId);
    const xpGanho = isCorrect ? xpAmount : 0;

    await updateDoc(answerRef, {
      isCorrect,
      xp: xpGanho,
      gradedAt: new Date(),
    });

    if (isCorrect && userId && classId) {
      await addDoc(collection(db, "xp"), {
        userId, classId, amount: xpGanho,
        reason: "open_answer_graded", sessionId, questionId,
        createdAt: new Date(),
      });
    }
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
    getOpenAnswersForSession,
  };
}