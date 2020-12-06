import { credential, initializeApp } from "firebase-admin";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "socket.io-redis";

import { authenticate, connect, Event } from "./connection";


const http = createServer();
const io = new Server(http);

initializeApp({
    credential: credential.cert({
        // Private key is sanitized for Heroku deployment by replacing \\n characters with \n
        privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        projectId: process.env.PROJECT_ID,
        clientEmail: process.env.CLIENT_EMAIL,
    }),
});

if (process.env.REDIS_URL) {
    io.adapter(createAdapter(process.env.REDIS_URL));
    console.log('Enabled Redis');
}

io.use(authenticate);
io.on(Event.CONNECTION, connect);
http.listen(process.env.PORT);