import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../hooks/useCourses";
import { useQuizzes } from "../hooks/useQuizzes";
import { useClasses } from "../hooks/useClasses";
import { useIsMobile } from "../hooks/useIsMobile";

// Ícones SVG inline (sem dependência extra) ──────────────────────────────
const IconHome      = () => <Ico d="M3 12L12 3l9 9M4 10v10h5v-6h6v6h5V10" />;
const IconBook      = () => <Ico d="M12 6V3M6 3h12v18H6V3zM9 9h6M9 12h6M9 15h4" />;
const IconQuiz      = () => <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />;
const IconUsers     = () => <Ico d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />;
const IconChevron   = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconClass     = () => <Ico d="M3 7h18M3 12h18M3 17h12" />;
const IconSession   = () => <Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;

function Ico({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Componente principal 
export default function ProfessorSidebar({ isOpen, onClose }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();
  const isMobile   = useIsMobile();

  const { getCourses }         = useCourses();
  const { getQuizzes }         = useQuizzes();
  const { getClassesByCourse } = useClasses();

  const [courses, setCourses]   = useState([]);
  const [quizzes, setQuizzes]   = useState([]);
  // classesMap: { [courseId]: [ {id, semestre, status} ] }
  const [classesMap, setClassesMap] = useState({});

  // seções abertas: "disciplinas", "quizzes", e por courseId
  const [openSections, setOpenSections] = useState({ disciplinas: true });

  // Carrega dados ao montar
  useEffect(() => {
    if (!user) return;
    getCourses().then(setCourses);
    getQuizzes().then(setQuizzes);
  }, [user]);

  // Carrega turmas quando uma disciplina é expandida
  const handleExpandCourse = async (courseId) => {
    const nowOpen = !openSections[courseId];
    setOpenSections(prev => ({ ...prev, [courseId]: nowOpen }));
    if (nowOpen && !classesMap[courseId]) {
      const classes = await getClassesByCourse(courseId);
      setClassesMap(prev => ({ ...prev, [courseId]: classes }));
    }
  };

  const toggle = (key) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const go = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

  // Desktop: sempre visível; Mobile: drawer controlado por isOpen 
  const sidebarVisible = isMobile ? isOpen : true;

  if (!sidebarVisible && isMobile) return null;

  return (
    <>
      {/* Overlay escuro no mobile */}
      {isMobile && isOpen && (
        <div onClick={onClose} style={overlay} />
      )}

      <aside style={{
        ...sidebar,
        ...(isMobile ? sidebarMobile : sidebarDesktop),
        ...(isMobile && isOpen ? sidebarMobileOpen : {}),
      }}>
        {/* Cabeçalho da sidebar */}
        <div style={sidebarHeader}>
          <span style={sidebarTitle}>Menu</span>
          {isMobile && (
            <button onClick={onClose} style={closeBtn} title="Fechar menu">✕</button>
          )}
        </div>

        <nav style={nav}>
          {/* Início */}
          <NavItem
            icon={<IconHome />}
            label="Início"
            active={isActive("/professor")}
            onClick={() => go("/professor")}
          />

          {/* Disciplinas */}
          <Section
            icon={<IconBook />}
            label="Disciplinas"
            open={openSections.disciplinas}
            onToggle={() => toggle("disciplinas")}
            active={isActivePrefix("/professor/curso")}
          >
            {courses.length === 0 ? (
              <EmptyHint>Nenhuma disciplina criada</EmptyHint>
            ) : (
              courses.map(course => (
                <div key={course.id}>
                  {/* Linha da disciplina */}
                  <SubSection
                    icon={<IconUsers />}
                    label={course.nome}
                    open={!!openSections[course.id]}
                    onToggle={() => handleExpandCourse(course.id)}
                    active={isActivePrefix(`/professor/curso/${course.id}`)}
                    onClick={() => go(`/professor/curso/${course.id}`)}
                  />

                  {/* Turmas da disciplina */}
                  {openSections[course.id] && (
                    <div style={subList}>
                      {!classesMap[course.id] ? (
                        <EmptyHint>Carregando...</EmptyHint>
                      ) : classesMap[course.id].length === 0 ? (
                        <EmptyHint>Nenhuma turma</EmptyHint>
                      ) : (
                        classesMap[course.id].map(cls => (
                          <LeafItem
                            key={cls.id}
                            icon={<IconClass />}
                            label={cls.semestre}
                            badge={cls.status === "active" ? "ativa" : null}
                            active={isActive(`/professor/curso/${course.id}/turma/${cls.id}`)}
                            onClick={() => go(`/professor/curso/${course.id}/turma/${cls.id}`)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </Section>

          {/* Quizzes */}
          <Section
            icon={<IconQuiz />}
            label="Quizzes"
            open={openSections.quizzes}
            onToggle={() => toggle("quizzes")}
            active={isActivePrefix("/professor/quiz")}
          >
            {quizzes.length === 0 ? (
              <EmptyHint>Nenhum quiz criado</EmptyHint>
            ) : (
              quizzes.map(q => (
                <LeafItem
                  key={q.id}
                  icon={<IconQuiz />}
                  label={q.nome}
                  active={isActive(`/professor/quiz/${q.id}`)}
                  onClick={() => go(`/professor/quiz/${q.id}`)}
                />
              ))
            )}
          </Section>
        </nav>

        {/* Rodapé: versão */}
        <div style={sidebarFooter}>
          <span style={{ fontSize: "11px", color: "var(--texto-muito-suave)" }}>
            Inatelligent · Professor
          </span>
        </div>
      </aside>
    </>
  );
}

// Sub-componentes de navegação
function NavItem({ icon, label, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...navItem,
        background: active ? "var(--cor-primaria-claro)" : hover ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--cor-primaria-texto)" : "var(--texto)",
        fontWeight: active ? "700" : "600",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Section({ icon, label, open, onToggle, active, children }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ marginBottom: "4px" }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          ...navItem,
          background: active && !open ? "var(--cor-primaria-claro)" : hover ? "var(--bg-hover)" : "transparent",
          color: active ? "var(--cor-primaria-texto)" : "var(--texto)",
          fontWeight: "700",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ opacity: 0.7 }}>{icon}</span>
          {label}
        </span>
        <IconChevron open={open} />
      </button>
      {open && <div style={sectionChildren}>{children}</div>}
    </div>
  );
}

function SubSection({ icon, label, open, onToggle, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...navItem,
        ...subNavItem,
        background: active && !open ? "var(--cor-primaria-claro)" : hover ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--cor-primaria-texto)" : "var(--texto-suave)",
        justifyContent: "space-between",
      }}
    >
      {/* Clicar no nome navega para a disciplina */}
      <span
        onClick={onClick}
        style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, textAlign: "left" }}
      >
        <span style={{ opacity: 0.6 }}>{icon}</span>
        <span style={{ fontSize: "13px", fontWeight: "600" }}>{label}</span>
      </span>
      {/* Clicar no chevron expande turmas */}
      <span onClick={onToggle} style={{ padding: "0 4px", opacity: 0.6 }}>
        <IconChevron open={open} />
      </span>
    </button>
  );
}

function LeafItem({ icon, label, badge, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...navItem,
        ...leafItem,
        background: active ? "var(--cor-primaria-claro)" : hover ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--cor-primaria-texto)" : "var(--texto-suave)",
      }}
    >
      <span style={{ opacity: 0.5, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "12px", flex: 1, textAlign: "left" }}>{label}</span>
      {badge && <span style={badgeAtiva}>{badge}</span>}
    </button>
  );
}

function EmptyHint({ children }) {
  return (
    <p style={{
      fontSize: "12px", color: "var(--texto-muito-suave)",
      padding: "4px 12px 8px 36px", margin: 0, fontStyle: "italic",
    }}>
      {children}
    </p>
  );
}

// Estilos
const SIDEBAR_WIDTH = "260px";

const sidebar = {
  position: "fixed",
  top: "56px", // altura da Navbar
  left: 0,
  bottom: 0,
  width: SIDEBAR_WIDTH,
  background: "var(--bg-card)",
  borderLeft: "1px solid var(--borda)",
  display: "flex",
  flexDirection: "column",
  zIndex: 90,
  overflowY: "auto",
  overflowX: "hidden",
};

const sidebarDesktop = {
  // no desktop a sidebar é estática, sem transição
  boxShadow: "none",
};

const sidebarMobile = {
  transform: "translateX(100%)",
  transition: "transform 0.25s ease",
  boxShadow: "-4px 0 20px var(--sombra)",
};

const sidebarMobileOpen = {
  transform: "translateX(0)",
};

const overlay = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 89,
};

const sidebarHeader = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "16px 16px 12px",
  borderBottom: "1px solid var(--borda)",
  flexShrink: 0,
};

const sidebarTitle = {
  fontFamily: "'Fredoka One', sans-serif",
  fontSize: "16px", color: "var(--texto-suave)",
  letterSpacing: "0.5px",
};

const closeBtn = {
  background: "none", border: "none",
  color: "var(--texto-suave)", cursor: "pointer",
  fontSize: "18px", lineHeight: 1,
  padding: "4px 6px", borderRadius: "6px",
};

const nav = {
  flex: 1, padding: "10px 8px",
  display: "flex", flexDirection: "column", gap: "2px",
};

const navItem = {
  width: "100%", display: "flex", alignItems: "center", gap: "10px",
  padding: "9px 12px", borderRadius: "8px",
  border: "none", cursor: "pointer",
  fontSize: "14px", fontWeight: "600",
  transition: "background 0.15s, color 0.15s",
  textAlign: "left",
};

const subNavItem = {
  paddingLeft: "20px",
};

const leafItem = {
  paddingLeft: "32px",
};

const sectionChildren = {
  paddingTop: "2px",
};

const subList = {
  paddingLeft: "8px",
};

const sidebarFooter = {
  padding: "12px 16px",
  borderTop: "1px solid var(--borda)",
  flexShrink: 0,
};

const badgeAtiva = {
  fontSize: "10px", fontWeight: "bold",
  background: "var(--cor-primaria-claro)",
  color: "var(--cor-primaria-texto)",
  padding: "2px 6px", borderRadius: "8px",
  flexShrink: 0,
};

export { SIDEBAR_WIDTH };