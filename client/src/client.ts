import firebase from 'firebase/app';
import "firebase/auth";

import { authenticate, connect } from './connection';


// Represents the configuration for the Firebase instance.
firebase.initializeApp({
    apiKey: process.env.API_KEY,
});

// Initiates the connection to the server
const tryConnect = async () => {
    try {
        const token = await authenticate(process.env.EMAIL, process.env.PASSWORD, firebase.auth());
        connect(token);
    } catch (error) {
        console.error(`Authentication failed: ${error.message}`);
        process.exit(0);
    }
};

tryConnect();
