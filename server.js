import express from "express";
import config from "./config.js";
import streamRouter from "./routes/stream.js";
const server = express();
// parse request's body as JSON
server.use(express.json());

// register routes
server.use("/api/rio",streamRouter);

server.listen(config.SERVER.PORT, config.SERVER.HOST, () => {
    // logger.info(`Server is running on ${config.SERVER.HOST}:${config.SERVER.PORT}`);
    console.log(`Server is running on ${config.SERVER.HOST} : ${config.SERVER.PORT}`);
});
