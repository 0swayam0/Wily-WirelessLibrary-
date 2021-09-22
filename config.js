import firebase from 'firebase';
require('@firebase/firestore')

const firebaseConfig = {
  apiKey: "AIzaSyBDRtG1dh1Gxqd-b2PElHKl_-nUCOjnZYw",
  authDomain: "wily-app-c7f64.firebaseapp.com",
  projectId: "wily-app-c7f64",
  storageBucket: "wily-app-c7f64.appspot.com",
  messagingSenderId: "739101681236",
  appId: "1:739101681236:web:644db6ab67fa6d73f1afc1",
  measurementId: "G-N6E20BE0P8"
};

firebase.initializeApp(firebaseConfig);
export default firebase.firestore();