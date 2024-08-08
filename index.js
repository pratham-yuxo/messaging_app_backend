
// ******** new code *******
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import connect from "./db/db.js";
import cors from "cors";
import router from "./routes/forUser.js";
import { config } from 'dotenv';
config(); 
const frontend_url=process.env.FRONTEND_URL || "http://localhost:3000";
const app = express();
const server = http.createServer(app); // Create an HTTP server using Express app
// const io = new SocketIOServer(server); // Attach Socket.IO to the HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: [""], // Allow requests from this origin
    methods: ["GET", "POST"], // Allow these methods
    credentials: true, // Allow credentials
  },
});
connect(); // connecting MongoDB
const port = 5000;

app.use(cors({
  origin: `${frontend_url}`, // Allow requests from this origin
  methods: ["GET", "POST"], // Allow these methods
  credentials: true, // Allow credentials
}));app.use(express.json());
app.use("/api", router);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

let users = []; // array of active users

const addUser = (userData, socketId) => {
  !users.some((user) => user.email === userData.email) &&
    users.push({ ...userData, socketId });
};

const getUser = (userId) => {
  return users.find((user) => user.email === userId);
};


const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("addUsers", (data) => {
    addUser(data, socket.id);
    io.emit("getUsers", users);
  });

  socket.on("sendMessage", (data) => {
    const user = getUser(data.receiverId);
    user && io.to(user.socketId).emit("getMessage", data);
  });
 
   // Listen for an event to get an email by socket ID
  socket.on('getEmail', (socketId, callback) => {
    const user = users.find((user) => user.socketId === socketId);
    console.log("get mail",user)
    if (user) {
      callback(user.email);
    } else {
      callback(null);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    removeUser(socket.id);
    io.emit("getUsers", users);
  });

  socket.on("getSocketId", (cb) => {
    cb(socket.id);
  });

  socket.on("getSocketIdOfPersonYouAreCalling", (receiverId) => {
    const id = getUser(receiverId);
    id && socket.emit("receiverSocketId", id.socketId);
  });

  socket.on("disconnectFromVc", () => {
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    console.log(userToCall,"call",name)
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
});
