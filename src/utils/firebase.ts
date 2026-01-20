import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccountKey = require("../../bharatWorkerServiceAccountKey.json");

// import serviceAccountKey from "../../bharatWorkerServiceAccountKey.json";
import { ServiceAccount } from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey as ServiceAccount),
});

const verifyUserWithFirebase = async (idToken: string) => {
  return admin.auth().verifyIdToken(idToken)
    .then(async (decodedToken) => {
      const { uid, phone_number } = await decodedToken;
      return { "uid": uid, "phone_number": phone_number };
    })
    .catch((error) => {
      // console.error('Error verifying Firebase ID token:', error);
      return { error: "Invalid token" };
    });
}

const sendPushNotification = async (token: any, title: any, body: any, jobId: any,redirect_page:string) => {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
    data: {
      click_type: redirect_page, // custom value
      id: jobId,             // dynamic job id
    },
  };

  try {
    const response = await admin.messaging().send(message);  
    return { success: true, response };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }
}



const sendMultiplePushNotification = async (tokens: any, title: any, body: any, jobId: any, redirect_page: string) => {
  const deviceTokens: string[] = tokens;
  
  const message: admin.messaging.MulticastMessage = {
    tokens: deviceTokens,
    notification: {
      title: title,
      body: body,
    },
    data: {
      click_type: redirect_page, // custom value
      id: jobId,             // dynamic job id
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);  
    return response;
  } catch (error: any) {
    return error;
  }
  
}


export { verifyUserWithFirebase, sendPushNotification, sendMultiplePushNotification };

