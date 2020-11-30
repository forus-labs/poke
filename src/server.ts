import { auth, credential, FirebaseError, initializeApp } from "firebase-admin";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "socket.io-redis";

interface UserSocket extends Socket {
    uuid?: string;
}

class InvaidToken extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvaidToken';
    }
}

class InvalidArgument extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidArgument';
    }
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
    console.log('Enabled Redis');
}

io.use((socket: UserSocket, next) => {
    const token = socket.handshake.query['token'];
    if (token) {
        auth().verifyIdToken(token)
            .then((decodedToken) => {
                socket.uuid = decodedToken.uid;
                console.log(`Succesfully verified token for ${socket.id}`);
                next();
            }).catch((e: FirebaseError) => {
                const error = new InvaidToken(`Token could not be verified: ${e}`);
                console.error(error.message);
                next(error);
            });
    } else {
        const error = new InvalidArgument('Token is null or empty');
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

