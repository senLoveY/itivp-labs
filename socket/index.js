const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const online = new Map();

const initSocket = (server) => {
    io = new Server(server, { cors: { origin: '*' } });

    io.use((socket, next) => {
        const header = socket.handshake.headers.authorization;
        const token = socket.handshake.auth?.token || (header && header.split(' ')[1]);
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

        socket.join(`user:${email}`);

        const count = online.get(email) || 0;
        online.set(email, count + 1);
        if (count === 0) {
            socket.broadcast.emit('user:online', email);
        }
        socket.emit('users:online', [...online.keys()]);

        socket.on('tweet:join', (tweetId, ack) => {
            if (!Number.isInteger(tweetId)) {
                return ack?.({ ok: false, error: "tweetId must be an integer." });
            }
            socket.join(`tweet:${tweetId}`);
            ack?.({ ok: true });
        });

        socket.on('tweet:leave', (tweetId) => {
            socket.leave(`tweet:${tweetId}`);
        });

        socket.on('comment:typing', ({ tweetId, typing } = {}) => {
            const room = `tweet:${tweetId}`;
            if (!socket.rooms.has(room)) return;
            socket.to(room).emit('comment:typing', { tweetId, email, typing: Boolean(typing) });
        });

        socket.on('disconnecting', () => {
            for (const room of socket.rooms) {
                if (room.startsWith('tweet:')) {
                    socket.to(room).emit('comment:typing', { tweetId: Number(room.slice(6)), email, typing: false });
                }
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`Socket disconnected: ${email} (${socket.id}), ${reason}`);

            const left = online.get(email) - 1;
            if (left > 0) {
                online.set(email, left);
            } else {
                online.delete(email);
                io.emit('user:offline', email);
            }
        });
    });

    return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
