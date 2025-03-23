import { setState, createElement, Fragment } from "olovakit";
import Hello from "./hello.jsx";
export default function app() {
  const [count, setCount] = setState(0);
  const [data, setData] = setState([
    {
      id: 1,
      name: "John Doe",
    },
  ]);
  return (
    <>
      <Hello children={"Hello World"} />
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>increment</button>
      <ul>
        {data.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </>
  );
}
