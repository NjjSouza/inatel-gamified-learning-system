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
import CourseQuizzes from "./pages/CourseQuizzes";
import SessionPlayer from "./pages/SessionPlayer";
import ClassPageProfessor from "./pages/ClassPageProfessor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
              <Login />
          } 
        />

        <Route
          path="/aluno"
          element={
            <ProtectedRoute>
              <DashboardAluno />
            </ProtectedRoute>
          }
        />

        <Route
          path="/professor"
          element={
            <ProtectedRoute>
              <DashboardProfessor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/professor/curso/:courseId"
          element={
            <ProtectedRoute>
              <CoursePageProfessor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/aluno/curso/:courseId"
          element={
            <ProtectedRoute>
              <CoursePageAluno />
            </ProtectedRoute>
          }
        />

        <Route
          path="/entrar"
          element={
            <ProtectedRoute>
              <JoinSession />
            </ProtectedRoute>
          }
        />

        <Route
          path="/registrar"
          element={<Register />}
        />

        <Route
          path="/aluno/sessao/:sessionId"
          element={
            <ProtectedRoute>
              <SessionPlayer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/criar-quiz/:courseId"
          element={
            <ProtectedRoute>
              <CreateQuiz />
            </ProtectedRoute>
          }
        />

        <Route
          path="/professor/quiz/:quizId"
          element={
            <ProtectedRoute>
              <EditQuiz />
            </ProtectedRoute>
          }
        />

        <Route
          path="/professor/curso/:courseId/turma/:classId"
          element={
            <ProtectedRoute>
              <ClassPageProfessor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;