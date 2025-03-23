import { setState, setEffect, createElement, Fragment } from "olovakit";
import "./App.css";

export default function app() {
  const [quota, setQuota] = setState("");
  const [isRunning, setIsRunning] = setState(false);
  let intervalId;

  setEffect(() => {
    if (isRunning) {
      intervalId = setInterval(() => {
        fetch("https://api.chucknorris.io/jokes/random")
          .then((response) => response.json())
          .then((json) => setQuota(json.value));
      }, 3000);
    } else {
      clearInterval(intervalId);
    }

    return () => clearInterval(intervalId);
  }, [isRunning]);

  const handleClick = () => {
    setIsRunning(true);
  };

  return (
    <>
      <div className="container">
        <button onClick={handleClick}>Start Chuck Norris Jokes</button>
        <p>"{quota || "Click the button to start"}"</p>
      </div>
    </>
  );
}
