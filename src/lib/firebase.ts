import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDiOMxUO8meXh3UFBiA82Zw5kq-n8thgns",
  authDomain: "trading-ee659.firebaseapp.com",
  databaseURL: "https://trading-ee659-default-rtdb.firebaseio.com",
  projectId: "trading-ee659",
  storageBucket: "trading-ee659.firebasestorage.app",
  messagingSenderId: "785765796999",
  appId: "1:785765796999:web:f56db3bf47da58ceb03c22",
  measurementId: "G-Z4WZYKB45Z"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
