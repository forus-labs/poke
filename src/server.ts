import * as admin from "firebase-admin";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter, RedisAdapter } from "socket.io-redis";

interface ExtendedSocket extends Socket {
    uuid?: string;
}

const CONNECTION = 'connection';
const DISCONNECT = 'disconnect';
const UPDATE = 'update';

const http = createServer();
const io = new Server(http);
const redisAdapter: RedisAdapter = createAdapter(process.env.REDIS_URL, { key: process.env.REDIS_KEY });

admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        projectId: process.env.PROJECT_ID,
        clientEmail: process.env.CLIENT_EMAIL,
    }),
});

io.adapter(redisAdapter);
io.use((socket: ExtendedSocket, next) => {
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
                console.log(err.message);
                next(err);
            });
    } else {
        err.message += ' - InvalidArgumentException, Token is null or empty';
        console.log(err.message);
        next(err);
    }
});

io.on(CONNECTION, (socket: ExtendedSocket) => {
    //uuid of firebase user
    const uuid = socket.uuid;

    if (uuid) {
        // join User room
        socket.join(uuid);

        // on update
        socket.on(UPDATE, (data: ArrayBuffer) => {
            socket.broadcast.to(uuid).emit(UPDATE, data);
        });
    }

    //on disconnect
    socket.on(DISCONNECT, () => {
        console.log('user disconnected: ', socket.id);
    });
});

http.listen(process.env.PORT);

