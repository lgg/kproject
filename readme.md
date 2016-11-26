# api

## hardcoded for emulating NFC

* items:
    * 6408070025598
    * 4042448843227
    * 8016738709162
    * 3253560306977
    * 5000366120331
    * 3253561929052
    * 7320090038527
    * 7311490010787
    * 7320090038510
    * 7393564291018

## working with their API

### Images 

* to set size
    * e.g `?h=400&w=400`
* IMPORTANT use `&fit=fill`

### Product info

===

## app api

### add new order

* send get request to url:
    * `HOST/neworder/EAN-AMOUNT` for one item to buy
    * or
    * `HOST/neworder/EAN-AMOUNT,EAN-AMOUNT` for some items to buy
        * so just separate `EAN-AMOUNT` for each item by commas
* response will be like
    * `{"orderId":ORDERIDHERE}`
    * where `ORDERIDHERE` is integer unique id for your order

### check status of order

* send get request to url:
    * `HOST/status/ORDERID`
    * where `ORDERID` is the order id you got when adding
* response will be like
    * `{"status":"STATUSHERE"}`
    * where `STATUSHERE` is one of order status listed below
    
### order status

* wip - order is processing
* packed - order is completed/waiting for customer on pick point
* shipped- order is shipped to client
    
===

## web api