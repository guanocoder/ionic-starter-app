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
.factory("stockDataService", function($q, $http, encodeURIService) {

    var getDetailedData = function(ticker) {
        var deferred = $q.defer();
        //var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22${ticker}%22)&format=json&env=http://datatables.org/alltables.env`;
        var query = `select * from yahoo.finance.quotes where symbol IN ("${ticker}")`;
        var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=${encodeURIService.encode(query)}&format=json&env=http://datatables.org/alltables.env`;
        $http.get(yahooApiUrl)
            .success(json => {
                var jsonData = json.query.results.quote;
                deferred.resolve(jsonData);
            })
            .error(function(error) {
                console.log(`Details data error: ${error}`);
                deferred.reject();
            });
        return deferred.promise;
        
    };

    var getPriceData = function(ticker) {
        var deferred = $q.defer();
        var yahooApiUrl = `http://finance.yahoo.com/webservice/v1/symbols/${ticker}/quote?format=json&view=detail`;
        $http.get(yahooApiUrl)
            .success(json => {
                var jsonData = json.list.resources[0].resource.fields;
                deferred.resolve(jsonData);
            })
            .error(function(error) {
                console.log(`Price data error: ${error}`);
                deferred.reject();
            });
        return deferred.promise;
    };
    return {
        getPriceData: getPriceData,
        getDetailedData: getDetailedData,
    };
})

.factory('chartDataService', function($q, $http, encodeURIService) {
    
    var getHistoricalData = function (ticker, fromDate, endDate) {
        var deferred = $q.defer();
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
            })
            .error(function(error) {
                console.log(`Chart data error: ${error}`);
                deferred.reject();
            });
        return deferred.promise;
    };

    return {
        getHistoricalData : getHistoricalData
    }
})
;