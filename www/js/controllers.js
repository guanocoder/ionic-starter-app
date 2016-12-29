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

.controller('stockController', ["$scope", "$stateParams", "$ionicPopup", "stockDataService", "dateService", "chartDataService", "notesService", function($scope, $stateParams, $ionicPopup, stockDataService, dateService, chartDataService, notesService) {
  $scope.ticker = $stateParams.ticker;
  $scope.chartView = 4;
  $scope.stockNotes = [];

  // Service call with ngResource
  // $scope.finData = stockDataService.getStockData($scope.ticker);
  // $scope.finData.$promise.then(function (data) {
  //    console.log(data.query.results.quote);
  // });

  $scope.chartViewFunc = function(chartIndex) {
    $scope.chartView = chartIndex;
  }

  $scope.addNote = function() {
    $scope.note = {
      title: "Note title",
      body: "Note contents",
      date: dateService.currentDate(),
      ticker: $scope.ticker 
    };

    var notePopup = $ionicPopup.show({
      template: '<input type="text" ng-model="note.title" id="stock-note-title" /><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
      title: `New note for ${$scope.ticker}`,
      //subTitle: 'please blab ala bal',
      scope: $scope,
      buttons: [{
        text: 'Cancel',
        onTap: function(e) {
          return;
        }
      },{
        text: '<b>Save</b>',
        type: 'button-balanced',
        onTap: function(e) {
          if(!$scope.note.body) {
            e.preventDefault();
          } else {
            notesService.addNote($scope.ticker, $scope.note);
            return $scope.note.body;
          }
        }
      }]
    }).then(function(res) {
      $scope.stockNotes = notesService.getNotes($scope.ticker);
    })
  }

  $scope.openNote = function(index, title, body) {
    $scope.note = {
      title: title,
      body: body,
      date: dateService.currentDate(),
      ticker: $scope.ticker 
    };

    var notePopup = $ionicPopup.show({
      template: '<input type="text" ng-model="note.title" id="stock-note-title" /><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
      title: $scope.note.title,
      //subTitle: 'please blab ala bal',
      scope: $scope,
      buttons: [{
        text: 'Delete',
        type: 'button-assertive button-small',
        onTap: function(e) {
          notesService.deleteNote($scope.ticker, index);
        }
      },{
        text: 'Cancel',
        type: 'button-small',
        onTap: function(e) {
          return;
        }
      },{
        text: '<b>Save</b>',
        type: 'button-balanced button-small',
        onTap: function(e) {
          if(!$scope.note.body) {
            e.preventDefault();
          } else {
            notesService.deleteNote($scope.ticker, index);
            notesService.addNote($scope.ticker, $scope.note);
            return $scope.note.body;
          }
        }
      }]
    }).then(function(res) {
      $scope.stockNotes = notesService.getNotes($scope.ticker);
    })
  };
  

  $scope.$on("$ionicView.afterEnter", function() {
    getPriceData();
    getDetailedData();
    getChartData();
    $scope.stockNotes = notesService.getNotes($scope.ticker);
  });

  function getPriceData() {
    var promise = stockDataService.getPriceData($scope.ticker);
    promise.then(function(data) {
      console.log(data);
      $scope.stockPriceData = data;

      if(data.chg_percent >= 0 && data !== null) {
        $scope.reactiveColor = {'background-color': '#33cd5f'};
      } else if(data.chg_percent <= 0 && data !== null) {
        $scope.reactiveColor = {'background-color': '#ef473a'};
      }
    });
  }

  function getDetailedData() {
    var promise = stockDataService.getDetailedData($scope.ticker);
    promise.then(function(data) {
      console.log(data);
      $scope.stockDetailedData = data;
    });
  }

  function getChartData() {
    var promise = chartDataService.getHistoricalData($scope.ticker, dateService.oneYearAgoDate(), dateService.currentDate());

    promise.then(function(data) {
      $scope.myData = data.map(function(series) {
        series.values = series.values.map(function(d) { return {x: d[0], y: d[1] }; });
        return series;
      });
    });
  }

	var xTickFormat = function(d) {
		var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
		if (dx > 0) {
      return d3.time.format("%b %d")(new Date(dx));
		}
		return null;
	};

  var x2TickFormat = function(d) {
    var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
    return d3.time.format('%b %Y')(new Date(dx));
  };

  var y1TickFormat = function(d) {
    return d3.format(',f')(d);
  };

  var y2TickFormat = function(d) {
    return d3.format('s')(d);
  };

  var y3TickFormat = function(d) {
    return d3.format(',.2s')(d);
  };

  var y4TickFormat = function(d) {
    return d3.format(',.2s')(d);
  };

  var xValueFunction = function(d, i) {
    return i;
  };

	$scope.chartOptions = {
    chartType: 'linePlusBarChart',
    data: 'myData',
    margin: {top: 15, right: 0, bottom: 20, left: 0},
    interpolate: "cardinal",
    useInteractiveGuideline: false,
    yShowMaxMin: false,
    tooltips: false,
    showLegend: false,
    //useVoronoi: false,
    //showVoronoi: false,
    xShowMaxMin: false,
    xValue: xValueFunction,
    xAxisTickFormat: xTickFormat,
    x2AxisTickFormat: x2TickFormat,
    y1AxisTickFormat: y1TickFormat,
    y2AxisTickFormat: y2TickFormat,
    y3AxisTickFormat: y3TickFormat,
    y4AxisTickFormat: y4TickFormat,
    transitionDuration: 500,
    y1AxisLabel: "Price",
    y3AxisLabel: "Volume",
    noData: "Loading data...",
	};
  
}]);
