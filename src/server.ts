import { initializeApp, auth, FirebaseError, credential } from "firebase-admin";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "socket.io-redis";

interface UserSocket extends Socket {
    uuid?: string;
}

enum Event {
    CONNECTION = 'connection',
    DISCONNECT = 'disconnect',
    UPDATE = 'update',
}

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
    console.log('Redis support enabled');
}

io.use((socket: UserSocket, next) => {
    const token = socket.handshake.query['token'];
    const error = new Error('Authentication Failed');
    if (token) {
        auth().verifyIdToken(token)
            .then((decodedToken) => {
                socket.uuid = decodedToken.uid;
                console.log(`${socket.id} token was verified succesfully`);
                next();
            }).catch((FireBaseError: FirebaseError) => {
                error.message += ` - Token could not be verified: ${FireBaseError}`;
                console.error(error.message);
                next(error);
            });
    } else {
        error.message += ' - InvalidArgumentException, Token is null or empty';
        console.error(error.message);
        next(error);
    }
});

io.on(Event.CONNECTION, (socket: UserSocket) => {
    const uuid = socket.uuid;

    console.log(`${socket.id} has connected`);

    if (uuid) {
        socket.join(uuid);

        socket.on(Event.UPDATE, (data: ArrayBuffer) => {
            socket.broadcast.to(uuid).emit(Event.UPDATE, data);
            console.log(`${socket.id} group was updated`);
        });
    }
    socket.on(Event.DISCONNECT, () => {
        console.log(`${socket.id} has disconnected`);
    });
});

http.listen(process.env.PORT);

