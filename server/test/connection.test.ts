import { auth } from "firebase-admin";
import { anyString, capture, instance, mock, reset, when } from 'ts-mockito';

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
    test('is successful', done => {
        when(mockedSocket.handshake).thenReturn(mockedHandshake('suKSRWjRyzbZAEMTY4i0mi1jan83'));
        const mSocket = instance(mockedSocket);
        const mAuth = instance(mockedAuth);
        function mNext(data) {
            try {
                // test if uuid is set correctly
                expect(mSocket.uuid).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
                // check next() is called without parameters
                expect(data).toBe(undefined);
                done();
            } catch (error) {
                done(error)
            }
        }
        authenticate(mSocket, mNext, mAuth);
    });
    test('failed from invalid token', done => {
        when(mockedSocket.handshake).thenReturn(mockedHandshake('Invalid'));
        const mSocket = instance(mockedSocket);
        const mAuth = instance(mockedAuth);
        function mNext(data) {
            try {
                // check next() returns error arguments with expected msg
                expect(data).toStrictEqual(new AuthenticationError('FirebaseError: Token is not valid'));
                done();
            } catch (error) {
                done(error)
            }
        }
        authenticate(mSocket, mNext, mAuth);
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


describe('Connect', () => {
    beforeEach(() => {
        reset(mockedSocket);
    });
    test('joined room with uuid', () => {
        when(mockedSocket.uuid).thenReturn('suKSRWjRyzbZAEMTY4i0mi1jan83');
        const mSocket = instance(mockedSocket);
        connect(mSocket);
        const [arg] = capture(mockedSocket.join).last();
        // test if socket.join is called with uuid
        expect(arg).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
    });

    test('broadcasted with uuid', () => {
        when(mockedSocket.uuid).thenReturn('suKSRWjRyzbZAEMTY4i0mi1jan83');
        when(mockedSocket.to(anyString())).thenReturn(mockedSocket);
        const mSocket = instance(mockedSocket);
        connect(mSocket);
        const [arg1, lambda] = capture(mockedSocket.on).first();
        lambda();
        const [arg2] = capture(mockedSocket.to).last();
        // test if socket.to is called with uuid
        expect(arg2).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
    });
});