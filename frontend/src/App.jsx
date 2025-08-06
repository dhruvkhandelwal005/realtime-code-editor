import { useEffect, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { FaPlay, FaCode } from "react-icons/fa";

const socket = io("http://localhost:5000/");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");

  useEffect(() => {
    socket.on("userJoined", (usersList) => setUsers(usersList));
    socket.on("codeUpdate", (newCode) => setCode(newCode));

    let typingTimeout;
    socket.on("userTyping", (user) => {
      setTyping(`${user} is typing`);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => setLanguage(newLanguage));
    socket.on("codeResponse", (response) => setOutput(response.run.output));

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => socket.emit("leaveRoom");
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
    setUsers([]);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", { code, roomId, language, version });
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <FaCode className="login-icon" />
          <h1>Join Code Room</h1>
          <input
            type="text"
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-left">
          <FaCode className="code-icon" />
        </div>
        <div className="top-center">
          <h3>Room: {roomId}</h3>
          {typing && <p className="typing-status">{typing}</p>}
        </div>
        <div className="top-right">
          <button className="run-btn" onClick={runCode}>
            <FaPlay />
          </button>
        </div>
      </div>

      <div className="main-container">
        {/* Sidebar */}
        <div className="sidebar">
          <h4>Language</h4>
          <select
            className="language-selector"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <h4>Users</h4>
          <ul className="users-list">
            {users.length > 0 ? (
              users.map((user, index) => (
                <li key={index} className="user-item">
                  <span className="user-avatar">
                    {user.charAt(0).toUpperCase()}
                  </span>
                  <span className="user-name">{user}</span>
                </li>
              ))
            ) : (
              <li>No users yet</li>
            )}
          </ul>

          <button className="leave-btn" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>

        {/* Editor */}
        <div className="editor-section">
          <Editor
            height="calc(100vh - 200px)"
            language={language}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
          <textarea
            className="output-console"
            value={output}
            readOnly
            placeholder="Output will appear here"
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default App;
