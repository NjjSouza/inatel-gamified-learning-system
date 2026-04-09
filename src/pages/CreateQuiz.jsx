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
    if (!nome) return alert("Digite o nome");

    const quiz = await createQuiz(courseId, nome);
    setQuizId(quiz.id);
  };

  const handleAddQuestion = async () => {
    if (!enunciado || alternativas.some(a => a === "")) {
      return alert("Preencha tudo!");
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

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
      <h1>Criar Quiz</h1>

      {!quizId ? (
        <>
          <input
            placeholder="Nome do quiz"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
          />

          <button onClick={handleCreateQuiz} style={{ padding: "10px 20px" }}>
            Criar
          </button>
        </>
      ) : (
        <>
          <h2>Adicionar Pergunta</h2>

          <input
            placeholder="Enunciado"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
          />

          {alternativas.map((alt, index) => (
            <div key={index} style={{ marginBottom: "8px" }}>
              <input
                placeholder={`Alternativa ${index + 1}`}
                value={alt}
                onChange={(e) => {
                  const novas = [...alternativas];
                  novas[index] = e.target.value;
                  setAlternativas(novas);
                }}
                style={{ padding: "8px", width: "70%" }}
              />

              <input
                type="radio"
                checked={correta === index}
                onChange={() => setCorreta(index)}
                style={{ marginLeft: "10px" }}
              />
              Correta
            </div>
          ))}

          <button onClick={handleAddQuestion} style={{ padding: "10px 20px" }}>
            Adicionar
          </button>

          <br /><br />

          <button onClick={() => navigate(-1)}>
            Voltar
          </button>
        </>
      )}
    </div>
  );
}