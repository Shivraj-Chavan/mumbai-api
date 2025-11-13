// src/test-server.js
import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello world\n");
});

server.listen(5005, "0.0.0.0", () => {
  console.log("✅ HTTP server running on http://localhost:5005");
});
