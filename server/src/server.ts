import { auth, credential, initializeApp } from "firebase-admin";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "socket.io-redis";

import { authenticate, connect, Event } from "./connection";


// A http server.
const http = createServer();
// A socket.io server.
const io = new Server(http);

// Intialises the Firebase-admin CLI.
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

// Verifies firebase tokens
io.use((socket, next) => authenticate(socket, next, auth()));

// Binds connect to conneciton events.
io.on(Event.CONNECTION, connect);

// Launch http server that listens to port number specified environment variables.
http.listen(process.env.PORT);
