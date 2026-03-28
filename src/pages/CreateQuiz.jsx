import { useState } from "react";
import { useQuizzes } from "../hooks/useQuizzes";

export default function CreateQuiz() {
  const { createQuiz } = useQuizzes();

  const [nome, setNome] = useState("");
  const [quizId, setQuizId] = useState(null);
  const [enunciado, setEnunciado] = useState("");
  const [alternativas, setAlternativas] = useState(["", "", "", ""]);
  const [correta, setCorreta] = useState(0);

  const handleCreateQuiz = async () => {
    const id = await createQuiz(nome);
    setQuizId(id);
    alert("Quiz criado! Agora adicione perguntas.");
  };

  const handleAddQuestion = async () => {
    if (!quizId) {
      alert("Crie o quiz primeiro!");
      return;
    }

    await addQuestion(quizId, {
      enunciado,
      alternativas,
      correta,
    });

    alert("Pergunta adicionada!");

    setEnunciado("");
    setAlternativas(["", "", "", ""]);
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
            <input
              key={index}
              placeholder={`Alternativa ${index + 1}`}
              value={alt}
              onChange={(e) =>
                handleAlternativaChange(index, e.target.value)
              }
          />
        ))}

        <select
          value={correta}
          onChange={(e) => setCorreta(Number(e.target.value))}
        >
          <option value={0}>Alternativa 1</option>
          <option value={1}>Alternativa 2</option>
          <option value={2}>Alternativa 3</option>
          <option value={3}>Alternativa 4</option>
        </select>

        <button onClick={handleAddQuestion}>
          Adicionar Pergunta
        </button>
      </>
    )}
  </div>
  );
}