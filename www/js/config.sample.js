/* Fill this file with required settings and copy to config.js */
angular.module('ionicStarterApp.config', []).constant('config', {
    urlPrefix: {
        proxy: {
            priceData: "yahoofinance",
            newsData: "yahoofeeds",
            stockSearchData: "yahoostocksearch"
        },
        priceData: "http://finance.yahoo.com",
        newsData: "http://feeds.finance.yahoo.com",
        stockSearchData: "https://s.yimg.com"
    },
    firebase: {
        apiKey: "???????????????????????????????????????",
        authDomain: "myfirstfirebase-*****.firebaseapp.com",
        databaseURL: "https://myfirstfirebase-?????.firebaseio.com",
        storageBucket: "myfirstfirebase-?????.appspot.com",
        messagingSenderId: "????????????"
    }
});