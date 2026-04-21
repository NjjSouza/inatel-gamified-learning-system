// Spinner de carregamento reutilizável
export default function Spinner() {
  return (
    <div style={wrapper}>
      <div style={circle} />
    </div>
  );
}

const wrapper = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px"
};

const circle = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  border: "4px solid #e0e0e0",
  borderTop: "4px solid #4CAF50",
  animation: "spin 0.8s linear infinite",
};