import { credential, initializeApp } from "firebase-admin";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "socket.io-redis";

import { authenticate, connect, Event } from "./connection";

// Initialise server instance
const http = createServer();
// Initialise new Socket.io server
const io = new Server(http);

// Intialise Firebase-admin CLI
initializeApp({
    credential: credential.cert({
        // Private key is sanitized for Heroku deployment by replacing \\n characters with \n
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDGjL8AoR3njMrs\ncnOTKKYuRqNUITPDEGNhCUz+1cHS7Nteh47QJn45goBhRSBp6KDRMThPGcca6Ndy\nllWIc+1L2HQJiUYv6zJdgIoplP8DJxSD0Pmg282lDgajdkL4+glXGiscmlDhe4X+\n3tz50WFEI0j3/HBbT+4FYT/pVD66uhAXhxPKfBWEPDBqJFIgq03T082qvV6SqKjM\nycMZBpSwrpemjbTRrtFrcqWFF3KYpxxF4FPWOcuGjhWFZovlenSJCle+RwEJlGwo\nI0vukbLg+Y7+maYIRnyQcSSEh7gsXwdbhjeKnDSsSyOYrZ7yVjlodPzKbeqPJw8o\n07mDja+vAgMBAAECggEAAOqXTc3WTjodCRW/HlKWxSUcpmfrVizr5Jn6MgjMwlOM\nHpHDaxDaak/eQKoCW6KShPpkrWG025u+mx+KOHgyPxbRG56EvhB3GXDWtAv922sV\n+XK/Co8IU8dEwV63A8ZdzqTQDqn7TrxxRqKYQDcSrP3yfluj5V7DKOr3SAxKemP1\npnDbIZEFPpsZGPjmMOH+HbcnU+XiW8X+Vs9poM3RhMABtCO0z2By3Zlv7njulgXW\n0KsXCRbmiKdbMNOqDoulcJfx2Ax81jTAmE0/31CFmmMce7hkZuUVvl2D0FGRnFLx\n7rE4a0VkrRZVov7FqZ0qS+h10ZFvUhiGU7FqiTRb0QKBgQDo+Go/8D4Ngnj3hdLm\nhcL2umA/EbvszDnSQ/6Y1UVzyAlphBLaXTd9dDtIBUf+iNF79WmYGlsIpK2Kw5Qa\ngWL32OxnY/lVORiP13eAPJwBSskQlTn1Mc5OKGoZJpRi7bQiIFQ1voVX8G3xvvoc\ndxsPGKKXZZ2kXVgh3AT+B/M20QKBgQDaLUdEzDbbLGikarTZFqf0CoU9WPhUboQN\ns9pi8yK9UUzlGC7PpHp3AVgTWKV83hJPZ8aCNCDKtAG5jZcZ9pEXmG4UpJavQLwR\n2ZjjNWhV8WGuWfZ0g76BtKoAD3gmn5UCd1HhALuexXJw0eaaKsy83/6YJqcMh6NG\nZSVjKikefwKBgDuwQdCl5dAiSInqcJF9XelG8RfXnFVcMchMgXN42PWEH9036Hin\n/2qWGAYozDxLo5hl1SsSPZamUoxF9bEgy1GC83a954jNOxzHcKebX8D4/zDPeuz2\nWMwvkJdnCgearVc8/zZR3OoeAJ06d+xJG9avUiEF+PC+tbDfJSxMrySxAoGAYXA5\nVRNzKF1j+pIhZJbGuan9KZHTjjmxRkFdtjVp/W0Sz3oGZfvKKd3yzOkZN3Qib04k\njL/lKUJNRuZiZlkFIamU+CktluVtWPd6XXbbuw5Llsdc11qDOYBLMC24dl9s+CX7\n7mYaZOU/n/1OZOnaeDv9g0w37NOi6ux/TxNkO9cCgYBfGP65RdeJyFaFB5n2T44s\nmbvnws7YfgQ/IsGgKj/acUK/teCP9jN0H5bdl2x0JeqGdHsCMWdOxIkHyM4XAZv0\n/kGJ4syBlBWip9rjjT7Yu0blR0gpbf3eimIP0N1zfkOd2UYK+UQJVL1tUUg9JwfW\nV/2GwLDUhZx94yXOO3pCIw==\n-----END PRIVATE KEY-----\n",//process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        projectId: "learningfirebase-marioplan", //process.env.PROJECT_ID,
        clientEmail: "firebase-adminsdk-fqjdb@learningfirebase-marioplan.iam.gserviceaccount.com", // process.env.CLIENT_EMAIL,
    }),
});

// Adding redis support
if (process.env.REDIS_URL) {
    io.adapter(createAdapter(process.env.REDIS_URL));
    console.log('Enabled Redis');
}

// Implment middleware for token verification
//io.use(authenticate);

// Listen to CONNECTION event
io.on(Event.CONNECTION, connect);
// Launch server
http.listen(3000, '127.0.0.1');//process.env.PORT);