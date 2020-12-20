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
        // test if socket.join is called with uuid
        socket.join(uuid);
        socket.on(Event.UPDATE, (data: ArrayBuffer) => {
            // test if socket.broadcast.to is called with uuid
            socket.broadcast.to(uuid).emit(Event.UPDATE, data);
            console.log(`${uuid} group was updated`);
        });
    }
    socket.on(Event.DISCONNECT, () => {
        console.log(`${uuid} has disconnected`);
    });
}
// Autheticates a client using its token.
function authenticate(socket: UserSocket, next: (err?: Error) => void, _auth: unknown): void {
    const token = socket.handshake.query['token'];
    if (token) {
        const auth = _auth as auth.Auth
        auth.verifyIdToken(token)
            .then((decodedToken) => {
                // test for parameter set, uuid is changed correctly
                socket.uuid = decodedToken.uid;
                console.log(`Succesfully verified token for ${socket.uuid}`);
                // check next() is called without parameters
                next();
            }).catch((e: FirebaseError) => {
                const error = new AuthenticationError(`${socket.uuid}'s token could not be verified: ${e}`);
                console.error(error.message);
                // check next() returns error arguments with expected msg
                next(error);
            });
    } else {
        const error = new AuthenticationError('Token is null or empty');
        console.error(error.message);
        next(error);
    }
}

export { authenticate, connect, Event, UserSocket, AuthenticationError }