var socket_host = window.location.origin;
var socket_args = {
    transports: ['websocket'],
    upgrade: false,
    cookie: false
};
var socket = io(socket_host, socket_args); //Socket io listener
var Promise = Promise || ES6Promise.Promise; //fix for promises
var snackbarContainer;

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
    socket.on('registered', function () {
        //Add listener for new order request
        socket.on('neworder', function (data) {
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
                    sum += item.price;
                    item.name = result[item.ean].name;
                    item.desc = result[item.ean].desc;
                    item.img = getImageUrl(result[item.ean].images)
                });

                order = {
                    id: data.order.id,
                    items: order,
                    summary: sum,
                    summaryText: sum + '€'
                };

                //display new order on manager screen
                displayNewOrder(order);

                //notify manager about new order
                var toast = {
                    message: 'New order # ' + data.order.id + ' added'
                };
                snackbarContainer.MaterialSnackbar.showSnackbar(toast);
            });
        });
    });
}


function displayNewOrder(order) {
    console.log(order);
}

function moveOrderToPacked() {

}

function moveOrderToDone() {

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
                result[item.ean] = {
                    price: getPrice(item.ean),
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
    headers.forEach(function (h) {
        request.setRequestHeader(h[0], h[1]);
    });

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

function getPrice(ean) {
    var hardcoded = [
        [6408070025598, 10],
        [4042448843227, 10],
        [8016738709162, 10],
        [3253560306977, 10],
        [5000366120331, 10],
        [3253561929052, 10],
        [7320090038527, 10],
        [7311490010787, 10],
        [7320090038510, 10],
        [7393564291018, 10],
    ];

    for (var i = 0; i < hardcoded.length; i++) {
        if (hardcoded[i][0] == ean) {
            return hardcoded[i][1];
        }
    }

    return random(5, 100);
}


function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}