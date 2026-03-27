import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../hooks/useCourses";
import { useNavigate } from "react-router-dom";
import { useSessions } from "../hooks/useSessions";

function DashboardProfessor() {
  const { user, logout } = useAuth();
  const { createCourse, getCourses } = useCourses();
  const { createSession, listenPlayers, getSessions } = useSessions();

  const navigate = useNavigate();

  const [nomeCurso, setNomeCurso] = useState("");
  const [courses, setCourses] = useState([]);

  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const data = await getCourses();
      setCourses(data);
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      const data = await getSessions();
      setSessions(data);
    };

    fetchSessions();
  }, []);

  const handleCreate = async () => {
    try {
      await createCourse(nomeCurso);
      setNomeCurso("");

      const updatedCourses = await getCourses();
      setCourses(updatedCourses);
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  const handleSelect = (course) => {
    navigate(`/professor/curso/${course.id}`);
  };

  const handleStartSession = async () => {
    const session = await createSession();

    setSessionId(session.id);
    setSelectedSession(session);
    setPlayers([]);

    const updatedSessions = await getSessions();
    setSessions(updatedSessions);
  };

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = listenPlayers(sessionId, setPlayers);

    return () => unsubscribe();
  }, [sessionId]);

  return (
    <div>
      <h1>Área do Professor</h1>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p>Bem-vindo, {user?.nome || "Usuário"}</p>
        <button onClick={logout}>Sair</button>
      </div>

      <h2>Criar Disciplina</h2>

      <input
        type="text"
        placeholder="Nome da disciplina"
        value={nomeCurso}
        onChange={(e) => setNomeCurso(e.target.value)}
      />

      <button onClick={handleCreate}>
        Criar
      </button>

      <h2>Minhas Disciplinas</h2>

      <ul>
        {courses.map((course) => (
          <li key={course.id}>
            <button onClick={() => handleSelect(course)}>
              {course.nome}
            </button>
          </li>
        ))}
      </ul>

      <h2>Iniciar Sessão</h2>

      <button onClick={handleStartSession}>
        Criar Sessão
      </button>

      <h2>Minhas Sessões</h2>

      <ul>
        {sessions.map((session) => (
          <li key={session.id}>
            <button
              onClick={() => {
                console.log("Sessão clicada:", session.id);
                setSessionId(session.id);
                setSelectedSession(session);
              }}
            >
              PIN: {session.pin} ({session.status})
            </button>
          </li>
        ))}
      </ul>

      {sessionId && (
        <div>
          <p>
            <strong>Código da sala:</strong> {selectedSession?.pin}
          </p>

          <h3>Jogadores na sessão</h3>

          {players.length === 0 ? (
            <p>Nenhum jogador entrou ainda...</p>
          ) : (
            <ul>
              {players.map((p) => (
                <li key={p.id}>{p.nome}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardProfessor;