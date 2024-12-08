let express = require("express");
let app = express();

app.use("/", express.static("public"));

let http = require("http");
const { SocketAddress } = require("net");
let server = http.createServer(app);
let io = require("socket.io");
const { MultiplyBlending } = require("three");
io = new io.Server(server);

// Serve static files
app.use(express.static("public")); // Ensure your HTML, CSS, and JS are in the "public" folder

// let userLocations = {};
let clients = new Map(); //to store user orientation data

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('location', (locationData) => {
      // Store client location
      clients.set(socket.id, {
          ...clients.get(socket.id),
          ...locationData
      });

      // Broadcast updated locations to all clients
      const clientLocations = Array.from(clients.entries())
          .map(([id, data]) => ({ id, ...data }))
          .filter(client => client.id !== socket.id);

      socket.broadcast.emit('locationUpdate', clientLocations);
  });

  socket.on('orientation', (orientationData) => {
      // Store client orientation
      clients.set(socket.id, {
          ...clients.get(socket.id),
          orientation: orientationData
      });
  });

  socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      clients.delete(socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});