# Instrument Closet Backend API

## Overview

This is a Node/Express API that allows developers (or the companion frontend) to reserve and track instrumets from a music inventory closet. It's a specific application of a general inventory management system. It has standard user auth. You can query instruments, reservation, or make a reservation for instruments.

**Deployed Here:**


## To Recreate
Require Tech: Node/npm

* Download/Clone Git and navigate to file

    ``` 
    $ git clone https://github.com/bcdunn7/instrument-closet-backend
    $ cd path-to-instrument-closet-backend
    ```

* Download dependencies

    ```
    $ npm install
    ```
    
* It is up and running! You can query it using Insomnia or any similar tool, or your own application!

### **Tech Used:**
- Node
- Express
- jsonwebtoken
- pg 

## API Docs
### Instruments
- POST /instruments
- GET 
- GET
- PATCH
- DELETE

##### POST /instruments
>@param { name, quantity, description, imageURL }
>
>@return Instrument instance => { id, name, quantity, description, imageURL, caregories: [{id, name],...]}
>
>AUTH: admin

##### GET /instruments
>@param string { name }
>
>@return { instruments : \[...\] }
>
> AUTH: logged-in

##### GET /instruments/\[instId\]
>@return { instrument: { id, name, quantity, description, imageURL, categories: \[{id, name}...\]}
>
>AUTH: logged-in

##### PATCH /instruments/\[instId\]
>@param all optional { name, quantity, description, imageURL }
>
>@return { instrument: { id, name, quantity, description, imageURL }
>
>AUTH: admin

##### DELETE /instruments/\[instId\]
>@return { deleted: \[instName\] (ID: \[instId\])}
>
>AUTH: admin
