import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import axios from "axios";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
    }

    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(userName);

    const updatedUsers = Array.from(rooms.get(roomId));

    // Send updated list to everyone in room
    io.to(roomId).emit("userJoined", updatedUsers);

    // Send directly to joining socket too (important for first user)
    socket.emit("userJoined", updatedUsers);
  });

  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("compileCode",async({code,roomId,language,version})=>{
    if(rooms.has(roomId)){
      const room = rooms.get(roomId)
      const response= await axios.post("https://emkc.org/api/v2/piston/execute",{
        language,
        version,
        files:[{
          content: code
        }]
      })

      room.output=response.data.run.output
      io.to(roomId).emit("codeResponse",response.data)
    }
  })


  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
    }
    console.log("User Disconnected");
  });
});

const __dirname = path.resolve();

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// Catch-all
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));
