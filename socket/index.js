const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (server) => {
    io = new Server(server, { cors: { origin: '*' } });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Token not provided."));
        }

        try {
            socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (error) {
            next(new Error("Invalid or expired token."));
        }
    });

    io.on('connection', (socket) => {
        const { email } = socket.data.user;
        console.log(`Socket connected: ${email} (${socket.id})`);

        socket.on('disconnect', (reason) => {
            console.log(`Socket disconnected: ${email} (${socket.id}), ${reason}`);
        });
    });

    return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
