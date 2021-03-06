angular.module("ionicStarterApp.services", [])

// Alternative way to get stock price data
// This code requires angular-resource.js include and ngResource injection
// .service("stockDataService", ["$resource", function($resource) {
//     this.getStockData = function(ticker) {
//         var yahooFinanceApi = $resource(
//             `http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22${ticker}%22)&format=json&env=http://datatables.org/alltables.env`,
//             { callback: "JSON_CALLBACK" },
//             { get: { method: "JSONP" }}
//         );
//         return yahooFinanceApi.get();
//     };
// }])

.service('modalService', function($ionicModal) {
    this.openModal = function(id) {
        var self = this;

        if(id == 1) {
            $ionicModal.fromTemplateUrl('templates/search.html', {
                scope: null,
                controller: 'searchController'
            }).then(function(modal) {
                self.modal = modal;
                self.modal.show();
            });
        } else if(id == 2) {
            $ionicModal.fromTemplateUrl('templates/login.html', {
                scope: null,
                controller: 'loginController'
            }).then(function(modal) {
                self.modal = modal;
                self.modal.show();
            });          
        } else {
            $ionicModal.fromTemplateUrl('templates/signup.html', {
                scope: null,
                controller: 'loginController'
            }).then(function(modal) {
                self.modal = modal;
                self.modal.show();
            });
        }
    };

    this.closeModal = function() {
        if(this.modal) {
            this.modal.hide();
            this.modal.remove();
        }
    };
})

.factory("encodeURIService", function() {
    return {
        encode: function(string) {
            return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape)
        }
    }
})
.factory("dateService", function($filter) {    
    var currentDate = function() {
        return $filter('date')(new Date(), 'yyyy-MM-dd');
    };

    var oneYearAgoDate = function() {
        return $filter('date')(new Date(new Date().setDate(new Date().getDate() - 365)), 'yyyy-MM-dd');
    };

    return {
        currentDate: currentDate,
        oneYearAgoDate: oneYearAgoDate,
    }
})

.factory("dataCacheService", function(CacheFactory) {
    var chartDataCache;
    chartDataCache = CacheFactory.get("chartDataCache");
    // I bet this shit gets called only once per app execution
    // but I just follow whatever crap I see in the course
    if(typeof(chartDataCache) == 'undefined') {
        chartDataCache = CacheFactory("chartDataCache", {
            maxAge: 15 * 60 * 1000,
            deleteOnExpire: 'aggressive',
            storageMode: 'localStorage'
        });     
    }
    return chartDataCache;
})

.factory("stockDataService", function($q, $http, encodeURIService, dataCacheService, config) {

    var getDetailedData = function(ticker) {
        var deferred = $q.defer();
        var cacheKey = `stock-data-${ticker}`;
        var chartDataCache = dataCacheService.get(cacheKey);
        if(chartDataCache) {
            deferred.resolve(chartDataCache);
        } else {
            //var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22${ticker}%22)&format=json&env=http://datatables.org/alltables.env`;
            var query = `select * from yahoo.finance.quotes where symbol IN ("${ticker}")`;
            var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=${encodeURIService.encode(query)}&format=json&env=http://datatables.org/alltables.env`;
            $http.get(yahooApiUrl)
            .success(json => {
                var jsonData = json.query.results.quote;
                deferred.resolve(jsonData);
                dataCacheService.put(cacheKey, jsonData);
            })
            .error(function(error) {
                console.log(`Details data error: ${error}`);
                deferred.reject();
            });
        }
        return deferred.promise;
        
    };

    // Ionic not smart enough to deal with its own proxies when running on device
    var urlPrefix = (window.cordova) ? config.urlPrefix : config.urlPrefix.proxy;

    var getPriceData = function(ticker, ignoreCache = false) {
        var deferred = $q.defer();
        var cacheKey = `price-data-${ticker}`;
        var chartDataCache = dataCacheService.get(cacheKey);
        if(chartDataCache && !ignoreCache) {
            deferred.resolve(chartDataCache);
        } else {
            // yahoofinance points to http://finance.yahoo.com (settings of proxies are in /ionic.config.json)
            // this allows to bypass CORS problem when running 'ionic serve'
            var yahooApiUrl = `${urlPrefix.priceData}/webservice/v1/symbols/${ticker}/quote?format=json&view=detail`;
            $http.get(yahooApiUrl)
            .success(json => {
                var jsonData = json.list.resources[0].resource.fields;
                deferred.resolve(jsonData);
                dataCacheService.put(cacheKey, jsonData);
            })
            .error(function(error) {
                console.log(`Price data error: ${error}`);
                deferred.reject();
            });
        }
        return deferred.promise;
    };
    return {
        getPriceData: getPriceData,
        getDetailedData: getDetailedData,
    };
})

.factory('chartDataService', function($q, $http, encodeURIService, dataCacheService) {
    
    var getHistoricalData = function (ticker, fromDate, endDate) {
        var deferred = $q.defer();
        var cacheKey = `chart-data-${ticker}`;
        var chartDataCache = dataCacheService.get(cacheKey);

        if(chartDataCache) {
            deferred.resolve(chartDataCache);
        } else {
            var query = `select * from yahoo.finance.historicaldata where symbol = "${ticker}" and startDate = "${fromDate}" and endDate = "${endDate}"`;
            var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=${encodeURIService.encode(query)}&format=json&env=http://datatables.org/alltables.env`;
            $http.get(yahooApiUrl)
            .success(json => {
                var jsonData = json.query.results.quote;
                var priceData = [], volumeData = [];
                jsonData.forEach(dayDataObject => {
                    var date = Date.parse(dayDataObject.Date);
                    var price = parseFloat(Math.round(dayDataObject.Close * 100) / 100).toFixed(3);
                    var volume = dayDataObject.Volume;
                    priceData.unshift([date, price]);
                    volumeData.unshift([date, volume]);
                });
                var chartData = [{
                    key: "volume",
                    bar: true,
                    values: volumeData,
                },{
                    key: ticker,
                    values: priceData,
                }];
                deferred.resolve(chartData);
                dataCacheService.put(cacheKey, chartData);
            })
            .error(function(error) {
                console.log(`Chart data error: ${error}`);
                deferred.reject();
            });
        }
        return deferred.promise;
    };

    return {
        getHistoricalData : getHistoricalData
    }
})


.factory('notesService', function(firebaseRef, userService) {

    userService.addSignUpListener(function(authData) {
        allKeys().forEach(function(noteKey) {
            var ticker = noteKey.substring(11);
            var notes = getNotes(ticker);
            notes.forEach(function(note) {
                firebaseRef.database().ref().child('users').child(userService.getCurrentUser().data.uid)
                    .child('notes').child(ticker).push(note);
            });
        });
    });

    userService.addLogOutListener(function(authData) {
        removeAll();
    });

    userService.addLogInListener(function(authData) {
        removeAll();
        loadUserNotes();        
    });

    function loadUserNotes() {
        var user = userService.getCurrentUser();
        if(user.isAuthenticated) {
            firebaseRef.database().ref().child('users').child(user.data.uid).child('notes').once('value',
                function(snapshot) {
                    var notesFromDB = {};
                    snapshot.forEach(function(stock) {
                        stock.forEach(function(note) {
                            var ticker = note.child('ticker').val();
                            if(!notesFromDB[ticker])
                                notesFromDB[ticker] = [];
                            notesFromDB[ticker].push(note.val());
                        });
                    });
                    Object.keys(notesFromDB).forEach(function (ticker) {
                        localStorage.setItem(cacheKey(ticker), JSON.stringify(notesFromDB[ticker]));
                    });
                },
                function(error) {
                    console.log("Firebase error loading user notes: " + error);
                });
        }
    }

    function updateNotes(ticker, notes) {
        var user = userService.getCurrentUser();
        if(user.isAuthenticated) {
            firebaseRef.database().ref().child('users').child(user.data.uid)
                .child('notes').child(ticker).remove();
            notes.forEach(function(note) {
                firebaseRef.database().ref().child('users').child(user.data.uid)
                    .child('notes').child(ticker).push(note);
            });
        }
    }

    function allKeys() {
        var allStorageKeys = Object.keys(localStorage);
        var allNoteKeys = [];
        allStorageKeys.forEach(function(key) {
            if(key.startsWith('notes-data-'))
                allNoteKeys.push(key);
        });
        return allNoteKeys;
    }

    function cacheKey(ticker) {
        return `notes-data-${ticker}`;
    }

    function getNotes(ticker) {
        var notesString = localStorage.getItem(cacheKey(ticker));
        if(!notesString)
            return [];
        return eval(notesString);
    }

    function addNote(ticker, note) {
        var stockNotes = getNotes(ticker);
        stockNotes.push(note);
        localStorage.setItem(cacheKey(ticker), JSON.stringify(stockNotes));
        updateNotes(ticker, stockNotes);        
    }

    function deleteNote(ticker, index) {
        var stockNotes = getNotes(ticker);
        stockNotes.splice(index,1);
        localStorage.setItem(cacheKey(ticker), JSON.stringify(stockNotes));
        updateNotes(ticker, stockNotes);        
    }

    function removeAll() {
        allKeys().forEach(function(noteKey) {
            localStorage.removeItem(noteKey);
        });
    }

    return {
        getNotes: getNotes,
        addNote: addNote,
        deleteNote: deleteNote,
        removeAll: removeAll
    };
})


.factory('newsService', function($q, $http, config) {
    // Ionic not smart enough to deal with its own proxies when running on device
    var urlPrefix = (window.cordova) ? config.urlPrefix : config.urlPrefix.proxy;

    function getNews(ticker) {
        var deferred = $q.defer();
        var x2js = new X2JS();
        // yahoofeeds points to http://feeds.finance.yahoo.com (settings of proxies are in /ionic.config.json)
        // this allows to bypass CORS problem when running 'ionic serve'
        var url = `${urlPrefix.newsData}/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
        $http.get(url)
        .success(xml => {
            var xmlDoc = x2js.parseXmlString(xml);
            var jsonData = x2js.xml2json(xmlDoc);
            var jsonNews = jsonData.rss.channel.item;

            deferred.resolve(jsonNews);
            //dataCacheService.put(cacheKey, jsonData);
        })
        .error(function(error) {
            console.log(`News data error: ${error}`);
            deferred.reject();
        });
        //}
        return deferred.promise;        
    }

    return {
        getNews: getNews
    };
})

.factory('followStocksService', function($rootScope, firebaseRef, userService) {

    userService.addSignUpListener(function(authData) {
        var stockList = getStocksArray();
        firebaseRef.database().ref().child('users').child(authData.uid).child('stocks').set(stockList);
    });

    userService.addLogOutListener(function(authData) {
        removeAll();
    });

    userService.addLogInListener(function(authData) {
        removeAll();
        loadUserStockList();
    });

    function loadUserStockList() {
        var user = userService.getCurrentUser();
        if(user.isAuthenticated) {
            firebaseRef.database().ref().child('users').child(user.data.uid)
                .child('stocks').once('value', function(snapshot) {
                    var stocksFromDB = [];
                    snapshot.val().forEach(function(stock) {
                        stocksFromDB.push({ ticker: stock.ticker });
                    });
                    localStorage.setItem(storageKey, JSON.stringify(stocksFromDB));
                    $rootScope.$broadcast("followStocksService.userListLoaded");
                }, function(error) {
                    console.log("Firebase error loading stocklist: " + error);
                });
        }
    }

    function updateUserStockList(stockList) {
        var user = userService.getCurrentUser();
        if(user.isAuthenticated) {
            firebaseRef.database().ref().child('users').child(user.data.uid)
                .child('stocks').set(stockList);
        }
    }

    var storageKey = 'initial-stocks-data';
    function getStocksArray() {
        // default list if application data is empty
        var myStocks = [
            { ticker: 'AAPL' },
            { ticker: 'GPRO' },
            { ticker: 'FB' },
            { ticker: 'NFLX' },
            { ticker: 'TSLA' },
            { ticker: 'BRK-A' },
            { ticker: 'INTC' },
            { ticker: 'MSFT' },
            { ticker: 'GE' },
            { ticker: 'BAC' },
            { ticker: 'C' },
            { ticker: 'T' },
        ];
        var myStocksString = localStorage.getItem(storageKey);
        if(myStocksString)
            myStocks = JSON.parse(myStocksString);
        return myStocks;
    }

    function follow(ticker) {
        var followingStocks = getStocksArray();
        followingStocks.push({ ticker: ticker.toUpperCase() });
        localStorage.setItem(storageKey, JSON.stringify(followingStocks));
        updateUserStockList(followingStocks);
    }

    function unfollow(ticker) {
        var followingStocks = getStocksArray();
        for(var i = 0; i < followingStocks.length; i++) {
            if(followingStocks[i].ticker.toUpperCase() == ticker.toUpperCase()) {
                followingStocks.splice(i, 1);
                break;
            }
        }
        localStorage.setItem(storageKey, JSON.stringify(followingStocks));
        updateUserStockList(followingStocks);
    }

    function isFollowed(ticker) {
        var followingStocks = getStocksArray();
        for(var i = 0; i < followingStocks.length; i++) {
            if(followingStocks[i].ticker.toUpperCase() == ticker.toUpperCase()) {
                return true;
            }
        }
        return false;
    }

    function removeAll() {
        localStorage.removeItem(storageKey);
    }

    return {
        getStocksArray: getStocksArray,
        follow: follow,
        unfollow: unfollow,
        isFollowed: isFollowed,
        removeAll: removeAll
    }
})

.factory('searchService', function($q, $http, config) {

    // Ionic not smart enough to deal with its own proxies when running on device
    var urlPrefix = (window.cordova) ? config.urlPrefix : config.urlPrefix.proxy;

    function search(query) {
        var deferred = $q.defer();
        //var url = `https://s.yimg.com/aq/autoc?query=${query}&region=CA&lang=en-CA&callback=JSON_CALLBACK`;
        //var url = `https://s.yimg.com/aq/autoc?query=${query}&region=RU&lang=ru-RU`;
        // yahoostocksearch points to https://s.yimg.com (settings of proxies are in /ionic.config.json)
        // this allows to bypass CORS problem when running 'ionic serve'
        var url = `${urlPrefix.stockSearchData}/aq/autoc?query=${query}&region=CA&lang=en-CA`;
        $http.get(url).success(function(data) {
            var jsonData = data.ResultSet.Result;
            deferred.resolve(jsonData);
        });

        return deferred.promise;
    }

    return {
        search: search
    };
})


.factory('firebaseRef', function($firebase, config) {
    firebase.initializeApp(config.firebase);
    return firebase;
})


.factory('userService', function(firebaseRef) {

    function getCurrentUser() {
        var currentUser = firebaseRef.auth().currentUser;
        var userEmail = (currentUser) ? currentUser.email : '';
        return {
            isAuthenticated: (currentUser ? true : false),
            email: userEmail,
            data: firebaseRef.auth().currentUser
        };
    }

    function signup(user) {
        return firebaseRef.auth().createUserWithEmailAndPassword(user.email, user.password).then(
            function(authData) {
                firebaseRef.database().ref().child('emails').push(user.email);
                fireSignUp(authData);
            }
        );
    }

    function login(user) {
        return firebaseRef.auth().signInWithEmailAndPassword(user.email, user.password);
    }

    function logout() {
        return firebaseRef.auth().signOut().then(
            function() {
                fireLogOut(null);
            }
        );
    }

    function onAuthStateChanged(authCallback) {
        firebaseRef.auth().onAuthStateChanged(function(user) {
            if(user) {
                fireLogIn(user);
            }
            authCallback(user);
        });
    }

    var _onSignUpCallbacks = [];
    var _onLogInCallbacks = [];
    var _onLogOutCallbacks = [];
    function fireSignUp(authData) { fireCallbacks(_onSignUpCallbacks, authData); }
    function fireLogIn(authData) { fireCallbacks(_onLogInCallbacks, authData); }
    function fireLogOut(authData) { fireCallbacks(_onLogOutCallbacks, authData); }
    function fireCallbacks(callbackArray, authData) {
        callbackArray.forEach(function(callback) {
            callback(authData);
        });
    }
    function addSignUpListener(callback) {
        _onSignUpCallbacks.push(callback);
    }
    function addLogInListener(callback) {
        _onLogInCallbacks.push(callback);
    }
    function addLogOutListener(callback) {
        _onLogOutCallbacks.push(callback);
    }

    return {
        signup: signup,
        login: login,
        logout: logout,
        getCurrentUser: getCurrentUser,
        onAuthStateChanged: onAuthStateChanged,
        addSignUpListener: addSignUpListener,
        addLogInListener: addLogInListener,
        addLogOutListener: addLogOutListener
    }
})
;