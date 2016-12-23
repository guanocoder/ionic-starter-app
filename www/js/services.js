angular.module("ionicStarterApp.services", [])

.service("stockDataService", ["$resource", function($resource) {
    this.getStockData = function(ticker) {
        var yahooFinanceApi = $resource(
            `http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22${ticker}%22)&format=json&env=http://datatables.org/alltables.env`,
            { callback: "JSON_CALLBACK" },
            { get: { method: "JSONP" }}
        );
        return yahooFinanceApi.get();
    };
}])
// some crazy shit from author of tutorial, fuk it! 
// .factory("stockDataService", function($q, $http) {
//     var getStockData = function(ticker) {
//         var deferred = $q.defer();
//         var yahooApiUrl = `http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22${ticker}%22)&format=json&env=http://datatables.org/alltables.env`;
//         $http.get(yahooApiUrl)
//             .success(json => {
//                 console.log(json.data.query.results);
//                 var jsonData = json.data.query.results.quote;
//                 deferred.resolve(jsonData);
//             })
//             .error(function(error) {
//                 console.log(`Price data error: ${error}`);
//                 deferred.reject();
//             });
//         return deferred.promise;
//     };
//     return {
//         getStockData : getStockData
//     };
// })
;