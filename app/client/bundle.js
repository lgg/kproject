(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
                result[item.ean] = {
                    price: getPrice(item.ean),
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
        [3253560306977, 8.95],
        [3253561929052, 17.95],
        [7320090038527, 41]
    ];

    for (var i = 0; i < hardcoded.length; i++) {
        if (hardcoded[i][0] == ean) {
            return hardcoded[i][1];
        }
    }

    return random(5, 100);
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

},{"./packedOrder.jade":2,"./wipOrder.jade":3}],2:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (Math, id, orderItems, summaryText, undefined) {
jade_mixins["itemLi"] = jade_interp = function(title, amount, price, ean, wid){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<li class=\"mdl-list__item mdl-list__item--three-line\"><span class=\"mdl-list__item-primary-content text-left\"><span class=\"full-width flex\"><div class=\"half-width\">" + (jade.escape(null == (jade_interp = title + '' + title) ? "" : jade_interp)) + "</div>");
var subSum = Math.ceil10(amount * price, -2);
buf.push("<div class=\"half-width text-right\">" + (jade.escape(null == (jade_interp = subSum + '€') ? "" : jade_interp)) + "</div></span><span class=\"mdl-list__item-text-body\">");
var amountText;
if (amount == 1){amountText = amount + ' pc';}else{amountText = amount + ' pcs';}
buf.push("<div>" + (jade.escape(null == (jade_interp = amountText) ? "" : jade_interp)) + "</div><div>" + (jade.escape(null == (jade_interp = ean) ? "" : jade_interp)) + "</div><div>" + (jade.escape(null == (jade_interp = wid) ? "" : jade_interp)) + "</div></span></span></li>");
};
buf.push("<td colspan=\"2\" class=\"no-padding\"><ul role=\"tablist\" aria-multiselectable=\"true\" class=\"mdlext-accordion mdlext-js-accordion mdlext-accordion--vertical mdlext-js-ripple-effect\"><li role=\"presentation\" class=\"mdlext-accordion__panel\"><header role=\"tab\" aria-expanded=\"false\" class=\"mdlext-accordion__tab\"><span class=\"mdlext-accordion__tab__caption full-width flex flex-between flex-center__y\"><div class=\"padding-20\">");
var checkboxId = 'checkbox-for-order' + id
buf.push("<label" + (jade.attr("for", checkboxId, true, false)) + " class=\"mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect\"><input" + (jade.attr("id", checkboxId, true, false)) + " type=\"checkbox\" class=\"mdl-checkbox__input\"/></label></div><div>" + (jade.escape(null == (jade_interp = id) ? "" : jade_interp)) + "</div><div>" + (jade.escape(null == (jade_interp = summaryText) ? "" : jade_interp)) + "</div></span><i class=\"mdlext-aria-toggle-material-icons\"></i></header><section role=\"tabpanel\" aria-hidden=\"false\" class=\"mdlext-accordion__tabpanel\"><ul class=\"demo-list-three mdl-list\">");
// iterate orderItems
;(function(){
  var $$obj = orderItems;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var item = $$obj[$index];

jade_mixins["itemLi"](item.name, item.amount, item.price, item.ean, item.wid);
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var item = $$obj[$index];

jade_mixins["itemLi"](item.name, item.amount, item.price, item.ean, item.wid);
    }

  }
}).call(this);

buf.push("</ul></section></li></ul></td>");}.call(this,"Math" in locals_for_with?locals_for_with.Math:typeof Math!=="undefined"?Math:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"orderItems" in locals_for_with?locals_for_with.orderItems:typeof orderItems!=="undefined"?orderItems:undefined,"summaryText" in locals_for_with?locals_for_with.summaryText:typeof summaryText!=="undefined"?summaryText:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":5}],3:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (Math, id, orderItems, summaryText, undefined) {
jade_mixins["itemLi"] = jade_interp = function(title, amount, price, ean, wid){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<li class=\"mdl-list__item mdl-list__item--three-line\"><span class=\"mdl-list__item-primary-content text-left\"><span class=\"full-width flex\"><div class=\"half-width\">" + (jade.escape(null == (jade_interp = title + '' + title) ? "" : jade_interp)) + "</div>");
var subSum = Math.ceil10(amount * price, -2);
buf.push("<div class=\"half-width text-right\">" + (jade.escape(null == (jade_interp = subSum + '€') ? "" : jade_interp)) + "</div></span><span class=\"mdl-list__item-text-body\">");
var amountText;
if (amount == 1){amountText = amount + ' pc';}else{amountText = amount + ' pcs';}
buf.push("<div>" + (jade.escape(null == (jade_interp = amountText) ? "" : jade_interp)) + "</div><div>" + (jade.escape(null == (jade_interp = ean) ? "" : jade_interp)) + "</div><div>" + (jade.escape(null == (jade_interp = wid) ? "" : jade_interp)) + "</div></span></span></li>");
};
buf.push("<td colspan=\"2\" class=\"no-padding\"><ul role=\"tablist\" aria-multiselectable=\"true\" class=\"mdlext-accordion mdlext-js-accordion mdlext-accordion--vertical mdlext-js-ripple-effect\"><li role=\"presentation\" class=\"mdlext-accordion__panel\"><header role=\"tab\" aria-expanded=\"false\" class=\"mdlext-accordion__tab\"><span class=\"mdlext-accordion__tab__caption full-width flex\"><div class=\"half-width\">" + (jade.escape(null == (jade_interp = id) ? "" : jade_interp)) + "</div><div class=\"half-width\">" + (jade.escape(null == (jade_interp = summaryText) ? "" : jade_interp)) + "</div></span><i class=\"mdlext-aria-toggle-material-icons\"></i></header><section role=\"tabpanel\" aria-hidden=\"false\" class=\"mdlext-accordion__tabpanel\"><ul class=\"demo-list-three mdl-list\">");
// iterate orderItems
;(function(){
  var $$obj = orderItems;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var item = $$obj[$index];

jade_mixins["itemLi"](item.name, item.amount, item.price, item.ean, item.wid);
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var item = $$obj[$index];

jade_mixins["itemLi"](item.name, item.amount, item.price, item.ean, item.wid);
    }

  }
}).call(this);

buf.push("</ul></section></li></ul></td>");}.call(this,"Math" in locals_for_with?locals_for_with.Math:typeof Math!=="undefined"?Math:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"orderItems" in locals_for_with?locals_for_with.orderItems:typeof orderItems!=="undefined"?orderItems:undefined,"summaryText" in locals_for_with?locals_for_with.summaryText:typeof summaryText!=="undefined"?summaryText:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":5}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
(function (global){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jade = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return (Array.isArray(val) ? val.map(joinClasses) :
    (val && typeof val === 'object') ? Object.keys(val).filter(function (key) { return val[key]; }) :
    [val]).filter(nulls).join(' ');
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};


exports.style = function (val) {
  if (val && typeof val === 'object') {
    return Object.keys(val).map(function (style) {
      return style + ':' + val[style];
    }).join(';');
  } else {
    return val;
  }
};
/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if (key === 'style') {
    val = exports.style(val);
  }
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    if (JSON.stringify(val).indexOf('&') !== -1) {
      console.warn('Since Jade 2.0.0, ampersands (`&`) in data attributes ' +
                   'will be escaped to `&amp;`');
    };
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will eliminate the double quotes around dates in ' +
                   'ISO form after 2.0.0');
    }
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

var jade_encode_html_rules = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};
var jade_match_html = /[&<>"]/g;

function jade_encode_char(c) {
  return jade_encode_html_rules[c] || c;
}

exports.escape = jade_escape;
function jade_escape(html){
  var result = String(html).replace(jade_match_html, jade_encode_char);
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

exports.DebugItem = function DebugItem(lineno, filename) {
  this.lineno = lineno;
  this.filename = filename;
}

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])(1)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"fs":4}]},{},[1]);
