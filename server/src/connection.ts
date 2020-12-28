import { auth, FirebaseError } from "firebase-admin";
import { Socket } from "socket.io";


// Represents a Socket.io event.
enum Event {
    CONNECTION = 'connection',
    DISCONNECT = 'disconnect',
    UPDATE = 'update',
}

// Represents a user socket.
interface UserSocket extends Socket {
    // A user's uuid.
    uuid?: string;
}

// Represents an authentication error.
class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

// Connects all clients with the same uuid to a room and listens for updates from other clients.
function connect(socket: UserSocket): void {
    const uuid = socket.uuid;
    console.log(`${uuid} has connected`);
    if (uuid) {
        socket.join(uuid);
        socket.on(Event.UPDATE, (data) => {
            socket.to(uuid).emit(Event.UPDATE, data);
            console.log(`${uuid} room was updated`);
        });
    }
    socket.on(Event.DISCONNECT, () => {
        console.log(`${uuid} has disconnected`);
    });
}

// Autheticates a client using its token.
function authenticate(socket: UserSocket, next: (err?: Error) => void, auth: auth.Auth): void {
    const token = socket.handshake.auth['token'];
    if (token) {
        auth.verifyIdToken(token).then((decodedToken) => {
            socket.uuid = decodedToken.uid;
            console.log(`Succesfully verified token for ${socket.uuid}`);
            return next();
        }).catch((e: FirebaseError) => {
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

export { authenticate, connect, Event, UserSocket, AuthenticationError }