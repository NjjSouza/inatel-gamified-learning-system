import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuizzes } from "../hooks/useQuizzes";

export default function CreateQuiz() {
  const { user } = useAuth();
  const { courseId } = useParams();
  const navigate = useNavigate();

  const { createQuiz, addQuestion } = useQuizzes();

  const [nome, setNome] = useState("");
  const [quizId, setQuizId] = useState(null);
  const [enunciado, setEnunciado] = useState("");
  const [alternativas, setAlternativas] = useState(["", "", "", "", ""]);
  const [correta, setCorreta] = useState(0);

  useEffect(() => {
    if (user?.tipo !== "professor") {
      navigate("/");
    }
  }, [user]);

  const handleCreateQuiz = async () => {
    try {
      if (!nome) {
        alert("Digite o nome do quiz");
        return;
      }

      const quiz = await createQuiz(courseId, nome);
      setQuizId(quiz.id);

    } catch (erro) {
      alert("Erro ao criar quiz: " + erro.message);
    }
  };

  const handleAddQuestion = async () => {
    if (!quizId) {
      alert("Crie o quiz primeiro!");
      return;
    }

    if (!enunciado || alternativas.some(a => a === "")) {
      alert("Preencha todos os campos!");
      return;
    }

    await addQuestion(quizId, {
      pergunta: enunciado,
      alternativas,
      respostaCorreta: correta,
    });

    alert("Pergunta adicionada!");

    setEnunciado("");
    setAlternativas(["", "", "", "", ""]);
    setCorreta(0);
  };

  const handleAlternativaChange = (index, value) => {
    const novas = [...alternativas];
    novas[index] = value;
    setAlternativas(novas);
  };

  return (
    <div>
      <h1>Criar Quiz</h1>

      {!quizId ? (
        <>
          <input
            placeholder="Nome do quiz"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <button onClick={handleCreateQuiz}>
            Criar Quiz
          </button>
        </>
      ) : (
        <>
          <h2>Adicionar Pergunta</h2>

          <input
            placeholder="Enunciado"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
          />

          {alternativas.map((alt, index) => (
            <div key={index}>
              <input
                placeholder={`Alternativa ${index + 1}`}
                value={alt}
                onChange={(e) =>
                  handleAlternativaChange(index, e.target.value)
                }
              />

              <input
                type="radio"
                name="correta"
                checked={correta === index}
                onChange={() => setCorreta(index)}
              />
              Correta
            </div>
          ))}

          <button onClick={handleAddQuestion}>
            Adicionar Pergunta
          </button>

          <button onClick={() => navigate(-1)}>
            Voltar
          </button>
        </>
      )}
    </div>
  );
}