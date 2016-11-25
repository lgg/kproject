//System vars
var http = require('http'); //http module from node.js
var log = require('./log.js');
var io;

//App settings
var port = 3003; //process.env.PORT; //port on which we will serve the app
var port_socket = 3003; //process.env.PORT; //port on which socket server will start

//data for orders
var orders = {},
    clientSockets = [];

//create http server
var app = require('express')();
var sserver = require('http').Server(app);
startSocket(sserver);
sserver.listen(port_socket);

//serve static files
app.use('/', require('express').static(__dirname + '/client'));

//API for mobile app
//create new order
app.get('/neworder/:itemId', function (req, res) {
    log.log('get request for new order #' + req.params.itemId);
    var newOrderId = Object.keys(orders).length,
        order = {
            id: newOrderId,
            itemId: req.params.itemId,
            status: 'wip',
        };
    orders.push(order);

    clientSockets.forEach(function (i, socket) {
        socket.emit('neworder', {order: order})
    });

    res.json({orderId: newOrderId});
});

//check order status
app.get('/status/:orderId', function (req, res) {
    log.log('get request for status check order #' + req.params.orderId);

    res.json({status: orders[req.params.orderId].status});
});

//If we have error - die
sserver.once('error', function (err) {
    if (err.code === 'EADDRINUSE') {
        // port is currently in use
        log.error("Can't start the server. Port is busy.");
    } else {
        log.error(err.code);
    }

    sserver.close();
    process.exit(1);
});

//Start socket.io server
function startSocket(server) {
    log.log("Starting socket");

    //Start socket.io server
    var options = {
        pingTimeout: 3000,
        pingInterval: 3000,
        transports: ['websocket'],
        allowUpgrades: false,
        upgrade: false,
        cookie: false
    };
    io = require('socket.io')(server, options);

    //Turn off limit of connections
    server.setMaxListeners(0);

    //handle sockets connections
    io.on('connection', function (socket) {
        log.log('new socket connection');

        clientSockets.push(socket);

        socket.emit('registered');

        socket.on('setstatus', function (data) {
            //@TODO
            console.dir(data);
        });
    });
}