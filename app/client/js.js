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

            /*
             id
             ean
             status
             */
            console.log(data.order);

            api.getItemInfo(data.order.ean);
        });
    });
}


function displayNewOrder(order) {

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
    getItemInfo: function (ean) {
        var headers = [
            ['X-IBM-Client-Id', api.ibmid],
            ['X-IBM-Client-Secret', api.key],
            ['accept-language', api.language],
            ['content-type', 'application/json'],
            ['accept', 'application/json']
        ];

        getJson(api.url + ean, headers, function (data) {
            return {
                name: data.name,
                desc: data.description,
                ean: ean,
                images: data.images
            };
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
