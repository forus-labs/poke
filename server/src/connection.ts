import { auth, FirebaseError } from "firebase-admin";
import { Socket } from "socket.io";

// Socket connection events being listened to
enum Event {
    CONNECTION = 'connection',
    DISCONNECT = 'disconnect',
    UPDATE = 'update',
}

// A socket with uuid as parameter
interface UserSocket extends Socket {
    uuid?: string;
}

// A general authentication error type
class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}


// Facilitates Socket client connection to the Server
function connect(socket: UserSocket): void {
    const uuid = socket.uuid;
    console.log(`${uuid} has connected`);
    if (uuid) {
        // Joins user to its room according to uuid
        socket.join(uuid);
        // Listens to UPDATE event
        socket.on(Event.UPDATE, (data: ArrayBuffer) => {
            // Broadcasts Protobuf files to all sockets in the room
            socket.broadcast.to(uuid).emit(Event.UPDATE, data);
            console.log(`${uuid} group was updated`);
        });
    }
    // Listens to DISCONNECT event
    socket.on(Event.DISCONNECT, () => {
        console.log(`${uuid} has disconnected`);
    });
}


// Autheticates client via its token
function authenticate(socket: UserSocket, next: (err?: Error) => void): void {
    // Token provided by client
    const token = socket.handshake.query['token'];
    if (token) {
        // Verifies authenticity of the ID token with firebase-auth 
        auth().verifyIdToken(token)
            .then((decodedToken) => {
                // Populate uuid parameter in socket
                socket.uuid = decodedToken.uid;
                console.log(`Succesfully verified token for ${socket.uuid}`);
                next();
            }).catch((e: FirebaseError) => {
                // Throws error if verification has failed
                const error = new AuthenticationError(`${socket.uuid}'s token could not be verified: ${e}`);
                console.error(error.message);
                next(error);
            });
    } else {
        // Throws error if Token was null or empty
        const error = new AuthenticationError('Token is null or empty');
        console.error(error.message);
        next(error);
    }
}

export { authenticate, connect, Event }