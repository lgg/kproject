var socket_host = window.location.origin;
var socket_args = {
    transports: ['websocket'],
    upgrade: false,
    cookie: false
};
var socket = io(socket_host, socket_args); //Socket io listener
window.Promise = window.Promise || window.ES6Promise.Promise; //fix for promises
var snackbarContainer,
    orders = [];

//load templates
var wipOrder = require("./wipOrder.jade"),
    packedOrder = require("./packedOrder.jade");

/**
 * Socket.io emit
 * @param type - type of message
 * @param val - value of message
 */
function send(type, val) {
    socket.emit(type, val);
}

document.addEventListener('DOMContentLoaded', function () {
    snackbarContainer = document.querySelector('#toast');

    registerSocket();
});

function registerSocket() {
    send('register');

    //Check if we have successfully registered
    socket.on('registered', function (r) {
        orders = r.orders;

        //load orders from server
        r.orders.forEach(function (o) {
            if (o) {
                switch (o.status) {
                    case 'wip':
                        displayNewOrder(o);
                        break;
                    case 'packed':
                        displayPackedOrder(o);
                        break;
                    default:
                        //not showing this order because it's already shipped
                        break;
                }
            }
        });

        //add listener for order status change
        socket.on('statusupdate', function (data) {
            if (orders[data.id].status !== data.status) {
                orders[data.id].status = data.status;

                moveOrderToPacked(data.id);
            }
        });

        //Add listener for new order request
        socket.on('neworder', function (data) {
            try {
                /*
                 id: newOrderId,
                 items: items,
                 status: 'wip'
                 */

                //parse ean from order
                var order = data.order.items;

                //load info from kesko api
                api.getItemInfo(order, function (result) {
                    var sum = 0;

                    order.forEach(function (item) {
                        item.price = result[item.ean].price;
                        sum += Math.ceil10(item.price * item.amount, -2);
                        item.wid = result[item.ean].wid;
                        item.name = result[item.ean].name;
                        item.desc = result[item.ean].desc;
                        item.img = getImageUrl(result[item.ean].images)
                    });

                    order = {
                        id: data.order.id,
                        status: data.order.status,
                        items: order,
                        summary: sum,
                        summaryText: sum + '€'
                    };

                    //send loaded data to server
                    socket.emit('updateorder', {id: order.id, order: order});

                    //update local order array
                    orders[order.id] = order;

                    //display new order on manager screen
                    displayNewOrder(order);

                    //notify manager about new order
                    notify('New order # ' + data.order.id + ' added');
                });
            } catch (e) {
                console.log(e);
                console.log('smth went wrong ean ' + data.order.items);
            }
        });
    });
}

function notify(message) {
    var toast = {
        message: message
    };
    snackbarContainer.MaterialSnackbar.showSnackbar(toast);
}

function displayNewOrder(order) {
    var tr = document.createElement('tr');
    tr.id = 'order' + order.id;
    tr.setAttribute('data-id', order.id);
    tr.innerHTML = wipOrder({
        id: order.id,
        summaryText: order.summaryText,
        orderItems: order.items
    });

    gid('section_wip').appendChild(tr);

    componentHandler.upgradeDom();
}

function displayPackedOrder(order) {
    var tr = document.createElement('tr');
    tr.id = 'order' + order.id;
    tr.setAttribute('data-id', order.id);
    tr.innerHTML = packedOrder({
        id: order.id,
        summaryText: order.summaryText,
        orderItems: order.items
    });

    gid('section_packed').appendChild(tr);

    gid('checkbox-for-order' + order.id).addEventListener('click', function () {
        moveOrderToShipped(order.id);
    });

    componentHandler.upgradeDom();
}

function moveOrderToPacked(orderId) {
    //remove orders from processing
    gid('order' + orderId).parentNode.removeChild(gid('order' + orderId));

    //show order in completed
    displayPackedOrder(orders[orderId]);

    //notify about order completion
    notify('Order # ' + orderId + ' completed');
}

function moveOrderToShipped(orderId) {
    //hide element
    gid('order' + orderId).classList.add("hide");
    setTimeout(function () {
        gid('section_packed').removeChild(gid('order' + orderId));
    }, 650);

    //update status at server and local
    orders[orderId].status = 'shipped';
    socket.emit('setstatus', {id: orderId, status: 'shipped'});
}

var api = {
    key: 'N1yF3gF4bE6vT1eL3aJ1jT2hH6wI0uV4iX8eJ3xK7tO0lA2jN8',
    url: 'https://api.eu.apiconnect.ibmcloud.com/kesko-dev-rauta-api/qa/products/',
    language: 'fi',
    ibmid: '4bc37a99-049e-4a03-8c35-270810e7e851',
    getItemInfo: function (items, callback) {
        var headers = [
            ['X-IBM-Client-Id', api.ibmid],
            ['X-IBM-Client-Secret', api.key],
            ['accept-language', api.language],
            ['content-type', 'application/json'],
            ['accept', 'application/json']
        ];

        var result = {},
            parsedItems = 0;

        items.forEach(function (item) {
            getJson(api.url + item.ean, headers, function (data) {
                getPrice(item.ean, function (price) {
                    result[item.ean] = {
                        price: price,
                        wid: getWarehouseId(),
                        name: data.name,
                        desc: data.description,
                        ean: item.ean,
                        images: data.images
                    };
                    parsedItems++;

                    if (parsedItems == items.length) {
                        callback(result);
                    }
                });
            });
        });
    }
};

function getImageUrl(images) {
    var height = 400,
        width = 400;
    for (var i = 0; i < images.length; i++) {
        if (images[i].type.toLowerCase() === 'product') {
            return images[i].url + '?h=' + height + '&w=' + width + '&fit=fill';
        }
    }
}

function getJson(url, headers, callback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    //set headers
    if (headers) {
        headers.forEach(function (h) {
            request.setRequestHeader(h[0], h[1]);
        });
    }

    request.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            // Success!
            var data = JSON.parse(this.response);
            callback(data);
        } else {
            // We reached our target server, but it returned an error
            callback(false, 'error happen', this.status);
        }
    };

    request.onerror = function (err) {
        // There was a connection error of some sort
        callback(false, 'error happen');
    };

    request.send();
}

function getPrice(ean, callback) {
    getJson('/price/' + ean, false, function (res) {
        callback(res.price);
    });
}

function getWarehouseId() {
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[random(0, letters.length)] + '-' + random(1, 99);
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function gid(id) {
    return document.getElementById(id);
}

Math.ceil10 = function (value, exp) {
    return decimalAdjust('ceil', value, exp);
};

function decimalAdjust(type, value, exp) {
    // Если степень не определена, либо равна нулю...
    if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // Если значение не является числом, либо степень не является целым числом...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Сдвиг разрядов
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Обратный сдвиг
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}
