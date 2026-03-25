import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAeuVSAqdqJus2hIO5iEK8NdkcbFUJuLAY",
  authDomain: "dark-darker-map-guesser-18a4e.firebaseapp.com",
  projectId: "dark-darker-map-guesser-18a4e",
  storageBucket: "dark-darker-map-guesser-18a4e.firebasestorage.app",
  messagingSenderId: "1009418946692",
  appId: "1:1009418946692:web:3b33e199e07234d9709ad1",
  measurementId: "G-E6LKPDSHWP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);