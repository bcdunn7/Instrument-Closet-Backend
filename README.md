# Instrument Closet Backend API

## Overview

This is a Node/Express API that allows developers (or the companion frontend which you can find [here](https://github.com/bcdunn7/Instrument-Closet-React-App)) to reserve and track instrumets from a music inventory closet. It's a specific implementation of a general inventory management system. It has standard user auth. You can query instruments, reservation, or make a reservation for instruments.

*Deployed Here:* []()

*API Docs:* [Documentation](https://theinstrumentclosetapi.readme.io/)


## To Recreate
Require Tech: Node/npm, PostgreSQL

* Download/Clone Git and navigate to file

    ``` 
    $ git clone https://github.com/bcdunn7/instrument-closet-backend
    $ cd path-to-instrument-closet-backend
    ```

* Install dependencies

    ```
    $ npm install
    ```
    
* Create postgresql database (start postgres if needed)

    ```
    (if needed)
    sudo service postgresql start

    $ createdb instrument_closet

    (for testing)
    $ createdb instrument_closet_test
    ```

* Create .env file in instrument-closet-backend with this information

    ```
    DB_PORT: 5432
    DB_USER: YOUR_PSQL_USERNAME
    DB_PASSWORD: YOUR_PSQL_PASSWORD
    SECRET_KEY: SOME_SECRET_KEY
    ```

* Run npm start

    ```
    $ npm start
    ```

* It is up and running! You can query it using Insomnia or any similar tool, or your own application!

* Test application with npm test

    ```
    $ npm test
    ```

### **Tech Used:**
- Node
- Express
- jsonwebtoken
- pg 

