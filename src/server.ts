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
const CONNECT_ERROR = 'connect_error';

const http = createServer();
const io = new Server(http);
const redisAdapter: RedisAdapter = createAdapter(process.env.REDIS_URL, {key: process.env.REDIS_KEY});

admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        projectId: process.env.PROJECT_ID,
        clientEmail: process.env.CLIENT_EMAIL,
    }),
});

io.adapter(redisAdapter);
io.use((socket: ExtendedSocket, next) => {
    const token: string = socket.handshake.headers['token_id'];
    const err = Error('Authentication Failed');
    if (token) {
        admin.auth().verifyIdToken(token)
            .then((decodedToken) => {
                socket.uuid = decodedToken.uid;
                console.log('ID token was verified succesfully, ', socket.uuid);
                next();
            }).catch((FirebaseError: admin.FirebaseError) => {
                err.message += ` - User ID could not be verified: ${FirebaseError}`;
            });
    }
    next(err);
})

io.on(CONNECTION, (socket: ExtendedSocket) => {
    const uuid = socket.uuid;

    // TODO: remove test code
    // initial connection message
    console.log('a user is connected ', socket.id);
    // TODO: remove test code
    // on connection, emit message
    socket.emit('message', 'Hello from the server');
    // TODO: remove test code
    // on message recieved
    socket.on('message', (msg: string) => {
        console.log('message: ' + msg);
    });

    // join User room
    if (uuid) {
        socket.join(uuid);

        // TODO: remove test code
        // sent user id to client
        socket.emit('id', uuid);

        // on update
        socket.on(UPDATE, (data: number) => {
            socket.broadcast.to(uuid).emit(UPDATE, data);
            console.log('updating devices, counter = ', data);
        });
    }

    //on disconnect
    socket.on(DISCONNECT, () => {
        console.log('user disconnected: ', socket.id);
    });

    //on middleware error
    socket.on(CONNECT_ERROR, (err) => {
        console.log('Connection error: ', err);
    });
});

http.listen(process.env.PORT, () => {
    // TODO: remove test code
    console.log('Server running at socketserverhi.herokuapp.com');
});

