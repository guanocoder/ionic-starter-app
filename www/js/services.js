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
                scope: $scope
            }).then(function(modal) {
                $scope.modal = modal;
            });          
        } else {
            $ionicModal.fromTemplateUrl('templates/login.html', {
                scope: $scope
            }).then(function(modal) {
                $scope.modal = modal;
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

.factory("stockDataService", function($q, $http, encodeURIService, dataCacheService) {

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

    var getPriceData = function(ticker, ignoreCache = false) {
        var deferred = $q.defer();
        var cacheKey = `price-data-${ticker}`;
        var chartDataCache = dataCacheService.get(cacheKey);
        if(chartDataCache && !ignoreCache) {
            deferred.resolve(chartDataCache);
        } else {
            var yahooApiUrl = `http://finance.yahoo.com/webservice/v1/symbols/${ticker}/quote?format=json&view=detail`;
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


.factory('notesService', function() {

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
    }

    function deleteNote(ticker, index) {
        var stockNotes = getNotes(ticker);
        stockNotes.splice(index,1);
        localStorage.setItem(cacheKey(ticker), JSON.stringify(stockNotes));
    }

    return {
        getNotes: getNotes,
        addNote: addNote,
        deleteNote: deleteNote
    };
})


.factory('newsService', function($q, $http) {
    function getNews(ticker) {
        var deferred = $q.defer();
        var x2js = new X2JS();
        //var cacheKey = `news-data-${ticker}`;
        //var chartDataCache = dataCacheService.get(cacheKey);
        //if(chartDataCache) {
        //    deferred.resolve(chartDataCache);
        //} else {
            //var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22${ticker}%22)&format=json&env=http://datatables.org/alltables.env`;
            var url = `http://finance.yahoo.com/rss/headline?s=${ticker}`;
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

.factory('followStocksService', function() {

    // var storageKey = 'following-stocks-data';
    // function getFollowingArray() {
    //     var followingStocks = [];
    //     var followingStocksString = localStorage.getItem(storageKey);
    //     if(followingStocksString)
    //         followingStocks = JSON.parse(followingStocksString);
    //     return followingStocks;
    // }

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

    return {
        getStocksArray: getStocksArray,
        follow: follow,
        unfollow: unfollow,
        isFollowed: isFollowed
    }
})

.factory('searchService', function($q, $http) {

    function search(query) {
        var deferred = $q.defer();
        //var url = `https://s.yimg.com/aq/autoc?query=${query}&region=CA&lang=en-CA&callback=JSON_CALLBACK`;
        //var url = `https://s.yimg.com/aq/autoc?query=${query}&region=RU&lang=ru-RU`;
        var url = `https://s.yimg.com/aq/autoc?query=${query}&region=CA&lang=en-CA`

        // not CORS friendly. But jsonp calls fail for some obscure reason so fuk it!
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
;