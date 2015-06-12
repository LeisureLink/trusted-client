## Classes
<dl>
<dt><a href="#AbstractClient">AbstractClient</a></dt>
<dd></dd>
<dt><a href="#TrustedClient">TrustedClient</a> : <code>object</code></dt>
<dd></dd>
</dl>
## Members
<dl>
<dt><a href="#log">log</a></dt>
<dd></dd>
</dl>
<a name="AbstractClient"></a>
## *AbstractClient*
**Kind**: global abstract class  
**Access:** public  

* *[AbstractClient](#AbstractClient)*
  * *[new AbstractClient(host, client, routeDefinitions)](#new_AbstractClient_new)*
  * *[.get(route, [params], [options], [callback])](#AbstractClient+get)*
  * *[.post(route, body, [options], callback)](#AbstractClient+post)*
  * *[.put(route, body, [options], callback)](#AbstractClient+put)*
  * *[.delete(route, params, [options], callback)](#AbstractClient+delete)*
  * *[.getRoute(name, [params])](#AbstractClient+getRoute) ⇒ <code>string</code>*

<a name="new_AbstractClient_new"></a>
### *new AbstractClient(host, client, routeDefinitions)*
A helper class for client implementations


| Param | Type |
| --- | --- |
| host | <code>string</code> | 
| client | <code>[TrustedClient](#TrustedClient)</code> | 
| routeDefinitions | <code>object</code> | 

<a name="AbstractClient+get"></a>
### *abstractClient.get(route, [params], [options], [callback])*
HTTP GET

**Kind**: instance method of <code>[AbstractClient](#AbstractClient)</code>  
**Access:** protected  

| Param | Type | Description |
| --- | --- | --- |
| route | <code>string</code> | the route name |
| [params] | <code>object</code> | the url parameters |
| [options] | <code>object</code> &#124; <code>function</code> |  |
| [callback] | <code>function</code> |  |

<a name="AbstractClient+post"></a>
### *abstractClient.post(route, body, [options], callback)*
HTTP POST

**Kind**: instance method of <code>[AbstractClient](#AbstractClient)</code>  
**Access:** protected  

| Param | Type |
| --- | --- |
| route | <code>string</code> | 
| body | <code>object</code> &#124; <code>array</code> | 
| [options] | <code>object</code> | 
| [options.params] | <code>object</code> | 
| callback | <code>function</code> | 

<a name="AbstractClient+put"></a>
### *abstractClient.put(route, body, [options], callback)*
HTTP PUT

**Kind**: instance method of <code>[AbstractClient](#AbstractClient)</code>  
**Access:** protected  

| Param | Type |
| --- | --- |
| route | <code>string</code> | 
| body | <code>object</code> &#124; <code>array</code> | 
| [options] | <code>object</code> | 
| [options.params] | <code>object</code> | 
| callback | <code>function</code> | 

<a name="AbstractClient+delete"></a>
### *abstractClient.delete(route, params, [options], callback)*
HTTP DELETE

**Kind**: instance method of <code>[AbstractClient](#AbstractClient)</code>  
**Access:** protected  

| Param | Type |
| --- | --- |
| route | <code>string</code> | 
| params | <code>object</code> | 
| [options] | <code>object</code> | 
| callback | <code>function</code> | 

<a name="AbstractClient+getRoute"></a>
### *abstractClient.getRoute(name, [params]) ⇒ <code>string</code>*
Builds the route based on the route template

**Kind**: instance method of <code>[AbstractClient](#AbstractClient)</code>  
**Access:** protected  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the routes name |
| [params] | <code>object</code> | parameters for the route template |

<a name="TrustedClient"></a>
## TrustedClient : <code>object</code>
**Kind**: global class  
**Access:** public  
**Properties**

| Name | Type |
| --- | --- |
| log | <code>function</code> | 

<a name="new_TrustedClient_new"></a>
### new TrustedClient(options, kind, message)
Trusted Client


| Param | Type |
| --- | --- |
| options | <code>object</code> | 
| options.keyId | <code>string</code> | 
| options.key | <code>object</code> | 
| kind |  | 
| message |  | 

<a name="log"></a>
## log
**Kind**: global variable  
**Access:** public  

| Param |
| --- |
| kind | 
| message | 

