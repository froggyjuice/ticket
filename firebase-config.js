// Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱 > Firebase SDK 설정 및 구성 값입니다.
// app.js가 이 값을 읽어서 Realtime Database의 ticketBookings 경로에 예매 정보를 저장합니다.
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyC00eeo6A8dFEPaKH4Ft3HUjw-aQSgR0mI",
    authDomain: "jbnu-orchestra.firebaseapp.com",
    databaseURL: "https://jbnu-orchestra-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "jbnu-orchestra",
    storageBucket: "jbnu-orchestra.firebasestorage.app",
    messagingSenderId: "70912922836",
    appId: "1:70912922836:web:0fc3d6ae57326be2a19741"
};

window.FIREBASE_BOOKINGS_PATH = "ticketBookings";
