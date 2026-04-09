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
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
      <h1>Editar Quiz</h1>

      <div style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />

        {alternativas.map((alt, index) => (
          <div key={index} style={{ marginBottom: "8px" }}>
            <input
              type="text"
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
              name="correta"
              checked={correta === index}
              onChange={() => setCorreta(index)}
              style={{ marginLeft: "10px" }}
            />
            Correta
          </div>
        ))}

        <button onClick={handleAdd} style={{ padding: "10px 20px" }}>
          Adicionar Pergunta
        </button>
      </div>

      <h2 style={{ marginTop: "30px" }}>Perguntas</h2>

      {questions.length === 0 ? (
        <p>Nenhuma pergunta ainda</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id} style={{
              listStyle: "none",
              marginBottom: "15px",
              padding: "15px",
              border: "1px solid #ccc",
              borderRadius: "10px",
              textAlign: "left"
            }}>
              <strong>{q.pergunta}</strong>

              <ul>
                {q.alternativas.map((alt, i) => (
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