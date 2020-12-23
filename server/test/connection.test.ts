import { auth } from "firebase-admin";
import { instance, mock, reset, verify, when } from 'ts-mockito';

import { authenticate, connect, UserSocket, AuthenticationError } from "../src/connection";


// Mocked Socket
const mockedSocket = mock<UserSocket>();
function mockedHandshake(tokenId: string) {
    return { auth: { token: tokenId }, query: undefined, address: undefined, headers: undefined, issued: undefined, secure: undefined, time: undefined, url: undefined, xdomain: undefined };
}

// Mocked Auth
const mockedAuth = mock<auth.Auth>();
const mockedDecodedToken = { uid: 'suKSRWjRyzbZAEMTY4i0mi1jan83', aud: '', exp: 3600, auth_time: undefined, firebase: undefined, iat: undefined, iss: undefined, sub: undefined };
when(mockedAuth.verifyIdToken('suKSRWjRyzbZAEMTY4i0mi1jan83')).thenResolve(mockedDecodedToken);
when(mockedAuth.verifyIdToken('Invalid')).thenReject(new Error('Token is not valid'));


describe('Authenticate', () => {
    beforeEach(() => {
        reset(mockedSocket);
    });
    test('is successful', () => {
        when(mockedSocket.handshake).thenReturn(mockedHandshake('suKSRWjRyzbZAEMTY4i0mi1jan83'));
        const mSocket = instance(mockedSocket);
        const mAuth = instance(mockedAuth);
        const mNext = jest.fn();
        authenticate(mSocket, mNext, mAuth);

        // test if uuid is set correctly
        // How do I create a setter for uuid
        expect(mSocket.uuid).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');

        // check next() is called without parameters
        // mNext is not called at all
        expect(mNext).toBeCalledWith();
    });
    test('failed from invalid token', () => {
        when(mockedSocket.handshake).thenReturn(mockedHandshake('Invalid'));
        const mSocket = instance(mockedSocket);
        const mAuth = instance(mockedAuth);
        const mNext = jest.fn();
        authenticate(mSocket, mNext, mAuth);

        // check next() returns error arguments with expected msg
        // mNext is not called at all
        expect(mNext).toHaveBeenCalledWith(new AuthenticationError('FirebaseError: Token does not exist'));
        //expect(mNext.mock.calls[0][0]).toBe(expect.stringContaining('Token could not be verified: '));
    });

    test('failed from empty token', () => {
        when(mockedSocket.handshake).thenReturn(mockedHandshake(''));
        const mSocket = instance(mockedSocket);
        const mAuth = instance(mockedAuth);
        const mNext = jest.fn();
        authenticate(mSocket, mNext, mAuth);

        // check next() returns error arguments with expected msg
        expect(mNext).lastCalledWith(new AuthenticationError('Token is null or empty'));
    });
});


// test if socket.join is called with uuid
// test if socket.broadcast.to is called with uuid
// test('Testing Connect', () => {

//     // mock the socket object
//     // mock the next callback

// });