//System vars
var http = require('http'); //http module from node.js
var log = require('./log.js');
var io;

//App settings
//var port = 3003; //process.env.PORT; //port on which we will serve the app
//var port_socket = 3003; //process.env.PORT; //port on which socket server will start

var port = process.env.PORT; //port on which we will serve the app
var port_socket = process.env.PORT; //port on which socket server will start

//data for orders
var orders = [],
    clientSockets = [],
    startIdForOrders = 100,
    prices = {
        3253560306977: 8.95,
        3253561929052: 17.95,
        7320090038527: 41
    };

//create http server
var app = require('express')();
var sserver = require('http').Server(app);
startSocket(sserver);
sserver.listen(port_socket);

//serve static files
app.use('/', require('express').static(__dirname + '/client'));

//API for mobile app
//create new order
app.get('/neworder/:items', function (req, res) {
    var items = req.params.items.split(',');

    for (var i = 0; i < items.length; i++) {
        var item_string = items[i];
        items[i] = {
            ean: item_string.substr(0, item_string.indexOf('-')),
            amount: item_string.substr(item_string.indexOf('-') + 1)
        }
    }

    var newOrderId;
    if (orders.length > 99) {
        newOrderId = orders.length;
    } else {
        newOrderId = startIdForOrders + orders.length;
    }

    var order = {
        id: newOrderId,
        items: items,
        status: 'wip'
    };

    log.log('get request for new order #' + newOrderId);

    orders[newOrderId] = order;

    clientSockets.forEach(function (socket) {
        socket.emit('neworder', {order: order})
    });

    res.json({orderId: newOrderId});
});

//check order status
app.get('/status/:orderId', function (req, res) {
    log.log('get request for status check order #' + req.params.orderId);

    res.json({status: orders[req.params.orderId].status});
});

//get price for order
app.get('/price/:ean', function (req, res) {
    log.log('get request for price by ean ' + req.params.ean);

    //fake price
    generatePrice(req.params.ean);

    //response price
    res.json({price: prices[req.params.ean]});
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

        socket.on('updateorder', function (data) {
            orders[data.id] = data.order;

            setTimeout(function () {
                log.log('update order # ' + data.id + ' status to packed');

                statusUpdate(data.id, 'packed');

                orders[data.id].status = 'packed';
            }, random(3000, 10000));
        });

        socket.on('register', function () {
            socket.emit('registered', {orders: orders});

            socket.on('setstatus', function (data) {
                orders[data.id].status = data.status;

                statusUpdate(data.id, data.status);
            });
        });
    });
}

function statusUpdate(id, status) {
    io.sockets.emit('statusupdate', {id: id, status: status});
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function generatePrice(ean) {
    if (prices[ean]) {
        return prices[ean];
    } else {
        prices[ean] = random(5, 100);
        return prices[ean];
    }
}