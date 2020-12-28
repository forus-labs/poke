import { auth } from "firebase-admin";
import { anyString, capture, instance, mock, when } from 'ts-mockito';

import { authenticate, connect, UserSocket, AuthenticationError } from "../src/connection";


const mockedSocket = mock<UserSocket>();
function handshake(tokenId: string) {
    return { auth: { token: tokenId }, query: undefined, address: undefined, headers: undefined, issued: undefined, secure: undefined, time: undefined, url: undefined, xdomain: undefined };
}

const mockedAuth = mock<auth.Auth>();
const decodedToken = { uid: 'suKSRWjRyzbZAEMTY4i0mi1jan83', aud: '', exp: 3600, auth_time: undefined, firebase: undefined, iat: undefined, iss: undefined, sub: undefined };
when(mockedAuth.verifyIdToken('suKSRWjRyzbZAEMTY4i0mi1jan83')).thenResolve(decodedToken);
when(mockedAuth.verifyIdToken('Invalid')).thenReject(new Error('Token is not valid'));


describe('authenticate', () => {
    test('is successful', done => {
        when(mockedSocket.handshake).thenReturn(handshake('suKSRWjRyzbZAEMTY4i0mi1jan83'));
        const socket = instance(mockedSocket);
        const auth = instance(mockedAuth);
        function next(data) {
            try {
                expect(socket.uuid).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
                expect(data).toBe(undefined);
                done();
            } catch (error) {
                done(error)
            }
        }
        authenticate(socket, next, auth);
    });

    test('fails from invalid token', done => {
        when(mockedSocket.handshake).thenReturn(handshake('Invalid'));
        const socket = instance(mockedSocket);
        const auth = instance(mockedAuth);
        function next(data) {
            try {
                expect(data).toStrictEqual(new AuthenticationError('FirebaseError: Token is not valid'));
                done();
            } catch (error) {
                done(error)
            }
        }
        authenticate(socket, next, auth);
    });

    test('fails from empty token', () => {
        when(mockedSocket.handshake).thenReturn(handshake(''));
        const socket = instance(mockedSocket);
        const auth = instance(mockedAuth);
        const next = jest.fn();
        authenticate(socket, next, auth);
        expect(next).lastCalledWith(new AuthenticationError('Token is null or empty'));
    });
});


describe('connect', () => {
    test('joins room with valid uuid', () => {
        when(mockedSocket.uuid).thenReturn('suKSRWjRyzbZAEMTY4i0mi1jan83');
        const socket = instance(mockedSocket);
        connect(socket);
        const [uuid] = capture(mockedSocket.join).last();
        expect(uuid).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
    });

    test('broadcasts with valid uuid', () => {
        when(mockedSocket.uuid).thenReturn('suKSRWjRyzbZAEMTY4i0mi1jan83');
        when(mockedSocket.to(anyString())).thenReturn(mockedSocket);
        const socket = instance(mockedSocket);
        connect(socket);
        const [event, lambda] = capture(mockedSocket.on).first();
        lambda();
        const [uuid] = capture(mockedSocket.to).last();
        expect(uuid).toBe('suKSRWjRyzbZAEMTY4i0mi1jan83');
    });
});