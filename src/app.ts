import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dbConnection from "./models/index.js";
import allRoutes from "./routes/index.js";
import http from "http"; // <-- important
import { Server } from "socket.io";
import { setupSwagger } from "./swagger.js";
import logger from "./utils/logger.js";
import { startCronJob } from "./utils/cron.js"; 
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({
    path: "./.env",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);  

const app: express.Application = express();
const publicPath = path.join(__dirname, "../public/razorpay"); 
app.get("/payment", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
});

// Create HTTP server manually
const server = http.createServer(app);


const allowedOrigins = ["http://localhost:5173", "http://161.97.107.255:5173"];
// https://api.bharatworker.com/api
// Attach Socket.io to HTTP server
const io = new Server(server, {
    // cors: {
    //     origin: allowedOrigins,
    // },
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Middleware
/*
app.use(
    cors({
        origin: allowedOrigins,
    })
);   
*/
app.use(cors()); // for use cors policy remove api

setupSwagger(app); 
startCronJob(); 
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((req, _res, next) => {
    console.log(`${req.method}  ${req.originalUrl}`);
    next();
});
app.use("/public", express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use("/api", allRoutes);

app.get("/", (req, res) => {
    res.end("Yaay! The server is up and healthy...");
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000; 
const startServer = async () => {
    await dbConnection();
    server.listen(PORT, "0.0.0.0", () => {
        // logger.warn(`Server running on http://localhost:${PORT}`);
        console.log(`Server running on http://localhost:${PORT}`);
    });
};
 
startServer();
export { io };
