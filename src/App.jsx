import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "./contexts/AuthContext";
import { useIsMobile } from "./hooks/useIsMobile";

import Navbar from "./components/Navbar";
import ProfessorSidebar, { SIDEBAR_WIDTH } from "./components/ProfessorSidebar";

import Login               from "./pages/Login";
import Register            from "./pages/Register";
import DashboardAluno      from "./pages/DashboardAluno";
import DashboardProfessor  from "./pages/DashboardProfessor";
import ProtectedRoute      from "./routes/ProtectedRoute";
import CoursePageProfessor from "./pages/CoursePageProfessor";
import CoursePageAluno     from "./pages/CoursePageAluno";
import JoinSession         from "./pages/JoinSession";
import EditQuiz            from "./pages/EditQuiz";
import SessionPlayer       from "./pages/SessionPlayer";
import ClassPageProfessor  from "./pages/ClassPageProfessor";
import ProfileAluno        from "./pages/ProfileAluno";
import ProfileProfessor    from "./pages/ProfileProfessor";
import SessionLivePage     from "./pages/SessionLivePage";
import CorrectOpenAnswers  from "./pages/CorrectOpenAnswers";
import OpenAnswersHistory  from "./pages/OpenAnswersHistory";

// Rotas onde a sidebar NÃO deve aparecer (tela cheia imersiva)
const ROTAS_SEM_SIDEBAR = [
  "/professor/sessao/", // sessão ao vivo
];

function AppLayout() {
  const { user }   = useAuth();
  const isMobile   = useIsMobile();
  const location   = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isProfessor = user?.tipo === "professor";

  // Oculta sidebar em rotas imersivas (sessão ao vivo)
  const rotaImersiva = ROTAS_SEM_SIDEBAR.some(r => location.pathname.includes(r));
  const showSidebar  = isProfessor && !rotaImersiva;

  // No desktop com sidebar, o conteúdo é empurrado para a direita
  const contentMarginLeft = showSidebar && !isMobile ? SIDEBAR_WIDTH : "0px";

  return (
    <>
      <Navbar
        onMenuToggle={() => setMenuOpen(o => !o)}
        menuOpen={menuOpen}
      />

      {showSidebar && (
        <ProfessorSidebar
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div style={{
        paddingTop: "56px", // altura da Navbar
        marginLeft: contentMarginLeft,
        transition: "margin-right 0.25s ease",
        minHeight: "100vh",
      }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/registrar" element={<Register />} />

          <Route path="/aluno" element={
            <ProtectedRoute allowedTipos={["aluno"]}><DashboardAluno /></ProtectedRoute>
          } />
          <Route path="/aluno/curso/:courseId" element={
            <ProtectedRoute allowedTipos={["aluno"]}><CoursePageAluno /></ProtectedRoute>
          } />
          <Route path="/aluno/sessao/:sessionId" element={
            <ProtectedRoute allowedTipos={["aluno"]}><SessionPlayer /></ProtectedRoute>
          } />
          <Route path="/aluno/perfil" element={
            <ProtectedRoute allowedTipos={["aluno"]}><ProfileAluno /></ProtectedRoute>
          } />

          {/* /entrar: exclusivo para alunos; preserva ?token= e ?sessao= no redirect */}
          <Route path="/entrar" element={
            <ProtectedRoute allowedTipos={["aluno"]}><JoinSession /></ProtectedRoute>
          } />

          <Route path="/professor" element={
            <ProtectedRoute allowedTipos={["professor"]}><DashboardProfessor /></ProtectedRoute>
          } />
          <Route path="/professor/curso/:courseId" element={
            <ProtectedRoute allowedTipos={["professor"]}><CoursePageProfessor /></ProtectedRoute>
          } />
          <Route path="/professor/curso/:courseId/turma/:classId" element={
            <ProtectedRoute allowedTipos={["professor"]}><ClassPageProfessor /></ProtectedRoute>
          } />
          <Route path="/professor/curso/:courseId/turma/:classId/respostas-abertas/:sessionId" element={
            <ProtectedRoute allowedTipos={["professor"]}><OpenAnswersHistory /></ProtectedRoute>
          } />
          <Route path="/professor/quiz/:quizId" element={
            <ProtectedRoute allowedTipos={["professor"]}><EditQuiz /></ProtectedRoute>
          } />
          <Route path="/professor/sessao/:sessionId" element={
            <ProtectedRoute allowedTipos={["professor"]}><SessionLivePage /></ProtectedRoute>
          } />
          <Route path="/professor/sessao/:sessionId/corrigir" element={
            <ProtectedRoute allowedTipos={["professor"]}><CorrectOpenAnswers /></ProtectedRoute>
          } />
          <Route path="/professor/perfil" element={
            <ProtectedRoute allowedTipos={["professor"]}><ProfileProfessor /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;