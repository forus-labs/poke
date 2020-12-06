import { auth, FirebaseError } from "firebase-admin";
import { Socket } from "socket.io";

export enum Event {
    CONNECTION = 'connection',
    DISCONNECT = 'disconnect',
    UPDATE = 'update',
}

interface UserSocket extends Socket {
    uuid?: string;
}

class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/* 
Joins authenticated users into their respective rooms,
listens for "update" events and pushes data to the room
*/
export function connect(socket: UserSocket): void {
    const uuid = socket.uuid;
    console.log(`${uuid} has connected`);
    if (uuid) {
        socket.join(uuid);

        socket.on(Event.UPDATE, (data: ArrayBuffer) => {
            socket.broadcast.to(uuid).emit(Event.UPDATE, data);
            console.log(`${uuid} group was updated`);
        });
    }
    socket.on(Event.DISCONNECT, () => {
        console.log(`${uuid} has disconnected`);
    });
}

/* 
Autheticates user via its token
*/
export function authenticate(socket: UserSocket, next: (err?: Error) => void): void {
    const token = socket.handshake.query['token'];
    if (token) {
        auth().verifyIdToken(token)
            .then((decodedToken) => {
                socket.uuid = decodedToken.uid;
                console.log(`Succesfully verified token for ${socket.uuid}`);
                next();
            }).catch((e: FirebaseError) => {
                const error = new AuthenticationError(`${socket.uuid}'s token could not be verified: ${e}`);
                console.error(error.message);
                next(error);
            });
    } else {
        const error = new AuthenticationError('Token is null or empty');
        console.error(error.message);
        next(error);
    }
}