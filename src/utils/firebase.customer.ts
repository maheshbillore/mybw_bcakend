import admin from "firebase-admin";
// import customerServiceAccountKey from "../../bharatWorkerServiceAccountKey.json" with { type: "json" };
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const customerServiceAccountKey = require("../../bharatWorkerServiceAccountKey.json");

import { ServiceAccount } from "firebase-admin";

admin.initializeApp({
    credential: admin.credential.cert(customerServiceAccountKey as ServiceAccount),
},
    "bharat-customer"
);

const verifyCustomerWithFirebase = async (idToken: string) => {
    const firebaseApp = admin.app("bharat-customer");
    return firebaseApp.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            const { uid, phone_number } = decodedToken; 
            return { uid, phone_number };
        })
        .catch((error) => {
            return { error: "Invalid token" };
        });
};

export { verifyCustomerWithFirebase };

