import * as admin from "firebase-admin";
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

admin.initializeApp({
    credential: admin.credential.cert({
        // Private key is sanitized for Heroku deployment by replacing \\n characters with \n
        privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        projectId: process.env.PROJECT_ID,
        clientEmail: process.env.CLIENT_EMAIL,
    }),
});

io.adapter(createAdapter(process.env.REDIS_URL, { key: process.env.REDIS_KEY }));

io.use((socket: UserSocket, next) => {
    const token = socket.handshake.query['token'];
    const err = new Error('Authentication Failed');
    if (token) {
        admin.auth().verifyIdToken(token)
            .then((decodedToken) => {
                socket.uuid = decodedToken.uid;
                console.log('ID token was verified succesfully, ', socket.uuid);
                next();
            }).catch((FirebaseError: admin.FirebaseError) => {
                err.message += ` - User ID could not be verified: ${FirebaseError}`;
                console.error(err.message);
                next(err);
            });
    } else {
        err.message += ' - InvalidArgumentException, Token is null or empty';
        console.error(err.message);
        next(err);
    }
});

io.on(Event.CONNECTION, (socket: UserSocket) => {
    const uuid = socket.uuid;

    console.log(`<${socket.id}> has connected `, );

    if (uuid) {
        socket.join(uuid);

        socket.on(Event.UPDATE, (data: ArrayBuffer) => {
            console.log(`updating <${socket.id}> group...`)
            socket.broadcast.to(uuid).emit(Event.UPDATE, data);
        });
    }

    socket.on(Event.DISCONNECT, () => {
        console.log('user disconnected: ', socket.id);
        console.log(`<${socket.id}> has disconnected `, );
    });
});

http.listen(process.env.PORT);

