import firebase from 'firebase/app';
import 'firebase/storage';
import 'firebase/firestore';
import 'firebase/database';
import 'firebase/auth';

let firebaseConfig = {
  apiKey: "AIzaSyBAS2KcD2moXaPefPEAu6mleaUjKCR1qL0",
  authDomain: "the-f2e-cloud-drive-83ee2.firebaseapp.com",
  databaseURL: "https://the-f2e-cloud-drive-83ee2.firebaseio.com",
  projectId: "the-f2e-cloud-drive-83ee2",
  storageBucket: "the-f2e-cloud-drive-83ee2.appspot.com",
  messagingSenderId: "199648573150",
  appId: "1:199648573150:web:b56137982b2c144afbb44f",
  measurementId: "G-8S2MVZ36GH"
};

if(!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

export const GoogleProvider = new firebase.auth.GoogleAuthProvider();
export const auth = firebase.auth();
export const DB = firebase.database();
export const StoreDB = firebase.firestore();
export const Store = firebase.storage();
export default firebase;
