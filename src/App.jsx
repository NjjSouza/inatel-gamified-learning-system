import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import DashboardAluno from "./pages/DashboardAluno";
import DashboardProfessor from "./pages/DashboardProfessor";
import ProtectedRoute from "./routes/ProtectedRoute";
import CoursePage from "./pages/CoursePage";
import JoinSession from "./pages/JoinSession";
import CreateQuiz from "./pages/CreateQuiz";
import EditQuiz from "./pages/EditQuiz";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

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
              <CoursePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/aluno/curso/:courseId"
          element={
            <ProtectedRoute>
              <CoursePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/entrar"
          element={
            <ProtectedRoute>
              <JoinSession/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/aluno/sessao/:sessionId"
          element={
            <ProtectedRoute>
              <div>Você entrou na sessão</div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/criar-quiz"
          element={
            <ProtectedRoute>
              <CreateQuiz />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz/:quizId"
          element={
            <ProtectedRoute>
              <EditQuiz />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;