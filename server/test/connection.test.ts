import { auth } from "firebase-admin";
import { anyString, capture, instance, mock, when } from 'ts-mockito';

import { authenticate, connect, UserSocket, AuthenticationError } from "../src/connection";

const uid = 'suKSRWjRyzbZAEMTY4i0mi1jan83';
const mockSocket = mock<UserSocket>();
when(mockSocket.id).thenReturn('sampleSocketId');
function handshake(tokenId: string) {
    return { auth: { token: tokenId }, query: undefined, address: undefined, headers: undefined, issued: undefined, secure: undefined, time: undefined, url: undefined, xdomain: undefined };
}

const mockAuth = mock<auth.Auth>();
const decodedToken = { uid: uid, aud: '', exp: 3600, auth_time: undefined, firebase: undefined, iat: undefined, iss: undefined, sub: undefined };
when(mockAuth.verifyIdToken(uid)).thenResolve(decodedToken);
when(mockAuth.verifyIdToken('Invalid')).thenReject(new Error('Token is not valid'));


describe('authenticate', () => {
    test('is successful', done => {
        when(mockSocket.handshake).thenReturn(handshake(uid));
        const socket = instance(mockSocket);
        const auth = instance(mockAuth);
        function next(data) {
            try {
                expect(socket.uuid).toBe(uid);
                expect(data).toBe(undefined);
                done();
            } catch (error) {
                done(error);
            }
        }
        authenticate(socket, next, auth);
    });

    test('fails from invalid token', done => {
        when(mockSocket.handshake).thenReturn(handshake('Invalid'));
        const socket = instance(mockSocket);
        const auth = instance(mockAuth);
        function next(data) {
            try {
                expect(data).toStrictEqual(new AuthenticationError('FirebaseError: Token is not valid'));
                done();
            } catch (error) {
                done(error);
            }
        }
        authenticate(socket, next, auth);
    });

    test('fails from empty token', () => {
        when(mockSocket.handshake).thenReturn(handshake(''));
        const socket = instance(mockSocket);
        const auth = instance(mockAuth);
        const next = jest.fn();
        authenticate(socket, next, auth);
        expect(next).lastCalledWith(new AuthenticationError('Token is null or empty'));
    });
});


describe('connect', () => {
    test('joins room with valid uuid', () => {
        when(mockSocket.uuid).thenReturn(uid);
        const socket = instance(mockSocket);
        connect(socket);
        const [uuid] = capture(mockSocket.join).last();
        expect(uuid).toBe(uid);
    });

    test('broadcasts with valid uuid', () => {
        when(mockSocket.uuid).thenReturn(uid);
        when(mockSocket.to(anyString())).thenReturn(mockSocket);
        const socket = instance(mockSocket);
        connect(socket);
        const [event, callback] = capture(mockSocket.on).first();
        callback();
        const [uuid] = capture(mockSocket.to).last();
        expect(uuid).toBe(uid);
    });
});