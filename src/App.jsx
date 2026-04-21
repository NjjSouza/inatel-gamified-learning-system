import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import DashboardAluno from "./pages/DashboardAluno";
import DashboardProfessor from "./pages/DashboardProfessor";
import ProtectedRoute from "./routes/ProtectedRoute";
import CoursePageProfessor from "./pages/CoursePageProfessor";
import CoursePageAluno from "./pages/CoursePageAluno";
import JoinSession from "./pages/JoinSession";
import CreateQuiz from "./pages/CreateQuiz";
import EditQuiz from "./pages/EditQuiz";
import Register from "./pages/Register";
import SessionPlayer from "./pages/SessionPlayer";
import ClassPageProfessor from "./pages/ClassPageProfessor";
import ProfileAluno from "./pages/ProfileAluno";
import ProfileProfessor from "./pages/ProfileProfessor";
import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ paddingTop: "56px" }}>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/aluno" element={
            <ProtectedRoute><DashboardAluno /></ProtectedRoute>
          } />

          <Route path="/professor" element={
            <ProtectedRoute><DashboardProfessor /></ProtectedRoute>
          } />

          <Route path="/professor/curso/:courseId" element={
            <ProtectedRoute><CoursePageProfessor /></ProtectedRoute>
          } />

          <Route path="/aluno/curso/:courseId" element={
            <ProtectedRoute><CoursePageAluno /></ProtectedRoute>
          } />

          <Route path="/entrar" element={
            <ProtectedRoute><JoinSession /></ProtectedRoute>
          } />

          <Route path="/registrar" element={<Register />} />

          <Route path="/aluno/sessao/:sessionId" element={
            <ProtectedRoute><SessionPlayer /></ProtectedRoute>
          } />

          <Route path="/criar-quiz/:courseId" element={
            <ProtectedRoute><CreateQuiz /></ProtectedRoute>
          } />

          <Route path="/professor/quiz/:quizId" element={
            <ProtectedRoute><EditQuiz /></ProtectedRoute>
          } />

          <Route path="/professor/curso/:courseId/turma/:classId" element={
            <ProtectedRoute><ClassPageProfessor /></ProtectedRoute>
          } />

          <Route path="/aluno/perfil" element={
            <ProtectedRoute><ProfileAluno /></ProtectedRoute>
          } />

          <Route path="/professor/perfil" element={
            <ProtectedRoute><ProfileProfessor /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;