angular.module('ionicStarterApp.controllers', [])

.controller('mainController', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };
})

.controller('myStocksController', ["$scope", function($scope) {
  $scope.myStocks = [
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
}])

.controller('stockController', ["$scope", "$stateParams", "stockDataService", "dateService", function($scope, $stateParams, stockDataService, dateService) {
  $scope.ticker = $stateParams.ticker;
  $scope.chartView = 1;

  // Service call with ngResource
  // $scope.finData = stockDataService.getStockData($scope.ticker);
  // $scope.finData.$promise.then(function (data) {
  //    console.log(data.query.results.quote);
  // });

  $scope.chartViewFunc = function(chartIndex) {
    $scope.chartView = chartIndex;
  }

  $scope.$on("$ionicView.afterEnter", function() {
    getPriceData();
    getDetailedData();
  });

  function getPriceData() {
    // Some wacko tucked up promise arsward calls
    var promise = stockDataService.getPriceData($scope.ticker);
    promise.then(function(data) {
      console.log(data);
      $scope.stockPriceData = data;
    });
  }

  function getDetailedData() {
    // Some wacko tucked up promise arsward calls
    var promise = stockDataService.getDetailedData($scope.ticker);
    promise.then(function(data) {
      console.log(data);
      $scope.stockDetailedData = data;
    });
  }

  console.log(dateService.currentDate());
  console.log(dateService.oneYearAgoDate());
  
}]);
