# Kesko store 2.0

Project for [Junction 2016](https://hackjunction.com/)

You can find more info [here](https://devpost.com/software/kesko-store-2-0)

This is code for server-side part and web interface.

## api docs

## available  domains

*domains are dead*

* https://kproject.paas.datacenter.fi/
* https://ktools.store/
* https://wearekesko.store/

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
* e.g. `http://kesko.fi/img/123?h=400&w=400&fit=fill`

### Product info

* you will need:
    * ibm unique app id (can be found on ibm api testing website after one of request)
        * or just take mine: `4bc37a99-049e-4a03-8c35-270810e7e851`
    * ibm app secret
        * or just take mine: `N1yF3gF4bE6vT1eL3aJ1jT2hH6wI0uV4iX8eJ3xK7tO0lA2jN8`  
* send get request to
    * url `https://api.eu.apiconnect.ibmcloud.com/kesko-dev-rauta-api/qa/products/EAN`
    * where `EAN` is product ean number
* your request must contain
    * headers:
        * `accept-language: 'fi'`
        * `content-type: 'application/json'`
        * `accept: 'application/json'`
        * `X-IBM-Client-Id: YOURAPPID`
        * `X-IBM-Client-Secret: YOURAPPSECRET`

---

## app api

**!!!IMPORTANT!!!** 

Everywhere change `HOST` to one domain name from top of rhis readme

### get price for product

* send get request to url:
    * `HOST/price/EAN` to get price for this item
* response will be like
    * `{"price":17.95}`

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
    
---

## web api

*todo add web api*
