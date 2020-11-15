import { auth, FirebaseError } from "firebase-admin";
import { Socket } from "socket.io";


// Represents a Socket.io event.
export enum Event {
    CONNECTION = 'connection',
    DISCONNECT = 'disconnect',
    UPDATE = 'update',
}

// Represents a user socket.
export interface UserSocket extends Socket {
    // A user's uuid.
    uuid?: string;
}

// Represents an authentication error.
export class AuthenticationError extends Error {
    // Creates an error with the name perameter.
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

// Connects all clients with the same uuid to a room and listens for updates from other clients.
export function connect(socket: UserSocket): void {
    const uuid = socket.uuid;
    console.log(`${uuid} <${socket.id}> has connected`);
    socket.join(uuid);
    socket.on(Event.UPDATE, (data) => {
        socket.to(uuid).emit(Event.UPDATE, data);
        console.log(`${uuid} <${socket.id}> has updated the room`);
    });
    socket.on(Event.DISCONNECT, () => {
        console.log(`${uuid} <${socket.id}> has disconnected`);
    });
}

// Autheticates a client using its token.
export function authenticate(socket: UserSocket, next: (err?: Error) => void, auth: auth.Auth): void {
    const token = socket.handshake.auth['token'];
    if (token) {
        auth.verifyIdToken(token).then((decodedToken) => {
            socket.uuid = decodedToken.uid;
            console.log(`Succesfully verified token for ${socket.uuid} <${socket.id}>`);
            return next();
        }).catch((e: FirebaseError) => {
            // Since ${e} returns “Error: <message>”, 
            // we prefix it with Firebase so that the message will look like 
            // E.g. FirebaseError: <message>
            const error = new AuthenticationError(`Firebase${e}`);
            console.error(error.message);
            return next(error);
        });
    } else {
        const error = new AuthenticationError('Token is null or empty');
        console.error(error.message);
        return next(error);
    }
}
