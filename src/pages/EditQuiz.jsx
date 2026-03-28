import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuizzes } from "../hooks/useQuizzes";

export default function EditQuiz() {
  const { quizId } = useParams();
  const { addQuestion, getQuestions } = useQuizzes();

  const [pergunta, setPergunta] = useState("");
  const [alternativas, setAlternativas] = useState(["", "", "", "", ""]);
  const [correta, setCorreta] = useState(0);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await getQuestions(quizId);
      setQuestions(data);
    };

    fetch();
  }, [quizId]);

  const handleAdd = async () => {
    try {
      if (!pergunta || alternativas.some(a => a === "")) {
        alert("Preencha tudo!");
        return;
      }

      if (alternativas.filter(a => a !== "").length < 2) {
        alert("Adicione pelo menos 2 alternativas");
        return;
      }

      await addQuestion(quizId, {
        pergunta,
        alternativas,
        respostaCorreta: correta,
      });

      const updated = await getQuestions(quizId);
      setQuestions(updated);

      setPergunta("");
      setAlternativas(["", "", "", "", ""]);
      setCorreta(0);

      alert("Pergunta adicionada!");
    } catch (erro) {
      alert("Erro: " + erro.message);
    }
  };

  return (
    <div>
      <h1>Editar Quiz</h1>

      <p>ID do quiz: {quizId}</p>

      <h2>Adicionar Pergunta</h2>

      <input
        type="text"
        placeholder="Pergunta"
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
      />

      {alternativas.map((alt, index) => (
        <div key={index}>
          <input
            type="text"
            placeholder={`Alternativa ${index + 1}`}
            value={alt}
            onChange={(e) => {
              const novas = [...alternativas];
              novas[index] = e.target.value;
              setAlternativas(novas);
            }}
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

      <button onClick={handleAdd}>
        Adicionar
      </button>

      <h2>Perguntas do Quiz</h2>

      {questions.length === 0 ? (
        <p>Nenhuma pergunta ainda</p>
      ) : (
        <ul>
          {questions.map((q) => (
            <li key={q.id}>
              <strong>{q.pergunta}</strong>

              <ul>
                {(q.alternativas || []).map((alt, i) => (
                  <li key={i}>
                    {alt} {i === q.respostaCorreta && <strong>(Correta)</strong>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}