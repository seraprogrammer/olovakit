import { setState } from "olovakit";

const App = () => {
  const [message, setMessage] = setState("Hello");
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold">{message}</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={() => setMessage("Hello olovakit")}
        >
          Change message
        </button>
      </div>
    </>
  );
};

export default App;
