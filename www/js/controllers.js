angular.module('ionicStarterApp.controllers', [])

.controller('mainController', function($scope, $rootScope, $window, modalService, userService, notesService, followStocksService) {
  $scope.modalService = modalService;

  $rootScope.currentUser = {
    isAuthenticated: false,
    data: null
  };

  userService.onAuthStateChanged(function(user) {
    if (user) {
        $rootScope.$apply(function() {
          $rootScope.currentUser = userService.getCurrentUser();
        });
        var currentUser = userService.getCurrentUser();
        console.log("CurrentUser: " + ((currentUser.isAuthenticated) ? currentUser.email : null));
    } else {
      // No user is signed in.
        $rootScope.currentUser = {
            isAuthenticated: false,
            data: null
        };
    }
  });

  $scope.logout = function() {
    userService.logout().then(function() {
        console.log("Log out successful");
        var currentUser = userService.getCurrentUser();
        console.log("CurrentUser: " + ((currentUser.isAuthenticated) ? currentUser.email : null));
        $rootScope.$apply(function() {
          $rootScope.currentUser = userService.getCurrentUser();
        });

        $window.location.reload(true);

    }).catch(function(error) {
        console.log("Sign out error: " + error);
        var currentUser = userService.getCurrentUser();
        console.log("CurrentUser: " + ((currentUser.isAuthenticated) ? currentUser.email : null));
    });
  };
})

.controller('myStocksController', ["$scope", "stockDataService", "followStocksService", function($scope, stockDataService, followStocksService) {

  $scope.$on('$ionicView.afterEnter', function(event, args) {
    updatePriceData();
  });

  $scope.$on('followStocksService.userListLoaded', function(event, args) {
    // reload data
    // TODO: implement programmatic pull to refresh trigger
    // https://calendee.com/2015/04/25/trigger-pull-to-refresh-in-ionic-framework-apps/
    updateStockList();
    updatePriceData();
  });

  $scope.unfollowStock = function(ticker) {
    followStocksService.unfollow(ticker);
    updateStockList();
    updatePriceData();
  };

  $scope.refresh = function() {
    console.log("update pulled!");
    updatePriceData(true, function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
    
  }

  function updateStockList() {
    $scope.myStocks = followStocksService.getStocksArray();
  }


  function updatePriceData(ignoreCache = false, onFinish = null) {
      $scope.myStocksPriceData = [];
      var promiseChain = null;

      // build price data load chain
      if($scope.myStocks.length > 0) {
          promiseChain = stockDataService.getPriceData($scope.myStocks[0].ticker, ignoreCache);

          var others = $scope.myStocks.slice(1);
          others.forEach(function(stock) {
              promiseChain = promiseChain.then(function(data) {
                  console.log("pushing data: " + data.symbol);
                  $scope.myStocksPriceData.push(data);
                  console.log("chaining ticker: " + stock.ticker);
                  return stockDataService.getPriceData(stock.ticker, ignoreCache);
              }, function(error) {
                  return stockDataService.getPriceData(stock.ticker, ignoreCache);
              });
          });

          // last one has to signal finish (for reload animation to stock for example)
          promiseChain.then(function(data) {
              console.log("pushing last data: " + data.symbol);
              $scope.myStocksPriceData.push(data);
              if(onFinish) onFinish();
          }, function(error) {
              if(onFinish) onFinish();
          });
      } else {
          // or signal finish if there is nothing to load
          if(onFinish) onFinish();
      }
  }

  // as if on focus event
  $scope.$on('$ionicView.enter', function(event, args) {
    updateStockList();
  });

  //updateStockList();
}])

.controller('stockController', ["$scope", "$stateParams", "$ionicPopup", "stockDataService", "dateService", "chartDataService", "notesService", "newsService", "followStocksService", function($scope, $stateParams, $ionicPopup, stockDataService, dateService, chartDataService, notesService, newsService, followStocksService) {
  $scope.ticker = $stateParams.ticker;
  $scope.chartView = 4;
  $scope.stockNotes = [];
  $scope.isFollowed = followStocksService.isFollowed($scope.ticker);

  // Service call with ngResource
  // $scope.finData = stockDataService.getStockData($scope.ticker);
  // $scope.finData.$promise.then(function (data) {
  //    console.log(data.query.results.quote);
  // });

  $scope.openWindow = function(link) {
    // TODO: install and set up inAppBrowser
    console.log("open window " + link);
  };

  $scope.toggleFollow = function() {
    if($scope.isFollowed) {
      followStocksService.unfollow($scope.ticker);
      $scope.isFollowed = false;
    } else {
      followStocksService.follow($scope.ticker);
      $scope.isFollowed = true;
    }
  }

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
    getNews();
    $scope.stockNotes = notesService.getNotes($scope.ticker);
  });

  function getNews() {
    $scope.newsStories = [];
    var promise = newsService.getNews($scope.ticker);

    promise.then(function(data) {
      $scope.newsStories = data;
    });
  }

  function getPriceData() {
    var promise = stockDataService.getPriceData($scope.ticker);
    promise.then(function(data) {
      console.log(data);
      $scope.stockPriceData = data;

      if(data.chg_percent >= 0 && data !== null) {
        $scope.reactiveColor = {'background-color': '#33cd5f', 'border-color': 'rgba(255,255,255,0.3)'};
      } else if(data.chg_percent <= 0 && data !== null) {
        $scope.reactiveColor = {'background-color': '#ef473a', 'border-color': 'rgba(0,0,0,0.2)'};
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
  
}])

.controller('searchController', ['$scope', '$state', 'modalService', 'searchService', function($scope, $state, modalService, searchService) {
  
  $scope.closeModal = function() {
    modalService.closeModal();
  }

  $scope.search = function() {
    $scope.searchResults = '';
    startSearch($scope.searchQuery);
  };

  var startSearch = ionic.debounce(
    function(query) {
      searchService.search(query).then(
        function(data) {
          $scope.searchResults = data;
        }
      );
    }
  , 750);

  $scope.gotoStock = function(ticker) {
    modalService.closeModal();
    $state.go('app.stock', { ticker: ticker});
  };

}])


.controller('loginController', ['$scope', '$rootScope', 'modalService', 'userService', function($scope, $rootScope, modalService, userService) {

  $scope.user = {
    email: "",
    password: ""
  };

  $scope.closeModal = function() {
    modalService.closeModal();
  };

  $scope.login = function(user) {
    userService.login(user).then(function(authData) {
        modalService.closeModal();
        console.log("Logged in user: " + userService.getCurrentUser().email);
        $rootScope.currentUser = userService.getCurrentUser();
    })
    .catch(function(error) {
        console.log("Login Failed!", error);
    });
  }

  $scope.signup = function(user) {
    userService.signup(user).then(function(authData) {
        modalService.closeModal();
        console.log("Signed up user: " + userService.getCurrentUser().email);
        $rootScope.currentUser = userService.getCurrentUser();
    })
    .catch(function(error) {
        console.log("Error creating user: ", error);
    });
  };

}])
;
