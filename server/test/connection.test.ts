import { auth, credential, initializeApp } from "firebase-admin";
import SocketMock from "socket.io-mock";

import { authenticate, connect, UserSocket, AuthenticationError } from "../src/connection";


const authMock = jest.fn((token: string, succeed: boolean) => {
    return {
        verifyIdToken: jest.fn(() => {
            if (succeed) {
                Promise.resolve(token)
            } else {
                if (token) {
                    Promise.reject('token could not be verified: ')
                }
                else {
                    Promise.reject('Token is null or empty')
                }

            }
        })
    };
});


describe('Authenticate', () => {
    test('is successful', () => {
        const mSocket: UserSocket = new SocketMock();
        const mNext = jest.fn();
        const mAuth = authMock('suKSRWjRyzbZAEMTY4i0mi1jan83', true);
        authenticate(mSocket, mNext, mAuth);

        // test if uuid is set correctly
        expect(mSocket.uuid).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
        // check next() is called without parameters
        expect(mNext).toBeCalledWith();

        //     mSocket.handshake.query['token'] = 'invalidToken';
        // auth().createCustomToken('suKSRWjRyzbZAEMTY4i0mi1jan83').then((customToken) => {
        //     mSocket.handshake.query['token'] = customToken;
        // });
    });
    test('failed from invalid token', () => {
        const mSocket: UserSocket = new SocketMock();
        const mNext = jest.fn();
        const mAuth = authMock('123', false);
        authenticate(mSocket, mNext, mAuth);

        // check next() returns error arguments with expected msg
        expect(mNext).toBeCalledWith(expect.objectContaining({
            message: expect.stringContaining('token could not be verified: ')
        }))
    });

    test('failed from empty token', () => {
        const mSocket: UserSocket = new SocketMock();
        const mNext = jest.fn();
        const mAuth = authMock('', false);
        authenticate(mSocket, mNext, mAuth);

        // check next() returns error arguments with expected msg
        expect(mNext).toBeCalledWith(expect.objectContaining({
            message: expect.stringContaining('Token is null or empty')
        }))
    });
});


// test if socket.join is called with uuid
// test if socket.broadcast.to is called with uuid
// test('Testing Connect', () => {

//     // mock the socket object
//     // mock the next callback

// });