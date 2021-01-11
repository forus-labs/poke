import firebase from 'firebase/app';
import { io, Socket } from "socket.io-client";
import readline from 'readline';

// Represents a Socket.io event.
enum Event {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    UPDATE = 'update',
    CONNECT_ERROR = 'connect_error',
}

// Authenticates user credentials and generates JWT token
export function authenticate(email: string, password: string, auth: firebase.auth.Auth): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        auth.signInWithEmailAndPassword(email, password).then(async (credentials) => {
            resolve(await credentials.user.getIdToken());
        }).catch((error) => {
            // Due to current firebase auth implmentation of closure promise library
            // Invalid crendential exceptions are only caught using promises instead of async/await
            // TODO: https://github.com/firebase/firebase-js-sdk/issues/1881
            reject(error);
        });
    });
}

const menu = `
    Send a message to the server.
    Type 'exit' to disconnect from the server.
`;

// Readline object to accept user input
const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Readline function wrapped as a promise
const inputMessage = () => {
    return new Promise<string>((resolve, reject) => {
        try {
            terminal.question('message: ', (msg) => resolve(msg));
        } catch (error) {
            reject(error);
        }
    });
};

// Updates room with messages from the socket
const updateServer = async (socket: Socket) => {
    let message = '';
    try {
        while (message !== 'exit') {
            message = await inputMessage();
            socket.emit(Event.UPDATE, message);
        }
    }
    catch (error) {
        console.error('Error: ', error);
    }
    console.log(`${socket.id} has disconnected`);
    socket.disconnect();
    terminal.close();
};

// Connects client to the server with its token
export function connect(token: string): void {
    const socket = io(process.env.URL, {
        transports: ['websocket'],
        autoConnect: true,
        auth: {
            token: token
        }
    });
    socket.on(Event.CONNECT, () => {
        console.log(`${socket.id} has connected`);
        console.log(menu);
        socket.on(Event.UPDATE, (data) => {
            readline.clearLine(process.stdout, 0);
            console.log(`\tServer: ${data}`);
            process.stdout.write('message: ');
        });
        updateServer(socket);
    });
    socket.on(Event.CONNECT_ERROR, (error) => {
        console.error(`Connection failed: ${error.message}`);
    });
}
