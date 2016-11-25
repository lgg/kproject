var socket_host = window.location.origin;
var socket_args = {
    transports: ['websocket'],
    upgrade: false,
    cookie: false
};
var socket = io(socket_host, socket_args); //Socket io listener
var Promise = Promise || ES6Promise.Promise; //fix for promises

/**
 * Socket.io emit
 * @param type - type of message
 * @param val - value of message
 */
function send(type, val) {
    socket.emit(type, val);
}

document.addEventListener('DOMContentLoaded', function () {
    registerSocket();
});

function registerSocket() {
    send('register');

    //Check if we have successfully registered
    socket.on('registered', function () {
        //Add listener for new order request
        socket.on('neworder', function (data) {
            console.log(data);
        });
    });
}

