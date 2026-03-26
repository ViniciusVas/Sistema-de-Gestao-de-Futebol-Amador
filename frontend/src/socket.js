import { io } from "socket.io-client";

console.log("Socket carregado");

export const socket = io("http://localhost:3000");