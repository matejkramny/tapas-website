app.controller('AdminCtrl', ['$scope', '$rootScope', '$modal', '$window', 'API', function ($scope, $rootScope, $modal, $window, API){
    $scope.refresh = function () {
        API.getSections(function (sections) {
            $scope.sections=sections;
        });
    };
    $scope.refresh();
    $scope.editItem = function(item) {
        var scope = $rootScope.$new();
        scope.item = item;
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            scope: scope,
            controller: 'EditItemInstanceCtrl',
            templateUrl: 'editItem'
        }).result.then(function() {
            $scope.refresh();
        });
    };
    $scope.deleteItem = function(id){
        if ($window.confirm("Are you sure you would like to delete this item?")) {
            API.deleteItem(id, function () {
                $scope.refresh();
            });
        }
    };
    $scope.addItem = function(section){
        var scope = $rootScope.$new();
        scope.section = section;
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            scope: scope,
            controller: 'AddItemInstanceCtrl',
            templateUrl: "addItem"
        }).result.then(function(item) {
            API.addItem(item, section, function(){
                $scope.refresh();
            });
        })
    };
    $scope.manageSections = function(){
        $modal.open({
            templateUrl: 'sections'
        })
    };
    $scope.orderLogs = function(){
        $modal.open({
            templateUrl:"/admin/logs"
        })
    };
}]);
app.controller('EditItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
    $scope.attrs = ['v', 'g'];
    $scope.toggleObject = {item: -1};
    $scope.ok = function () {
        //TODO Get values
        $modalInstance.close(item);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

    $scope.toggleVegan = function () {
        $scope.item.vegan=!$scope.item.vegan
    };

    $scope.toggleGlutenFree = function () {
        $scope.item.gluten_free=!$scope.item.gluten_free
    }
}]);
app.controller('AddItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
    $scope.item = {vegan:false, gluten_free:false};

    $scope.ok = function () {
        $modalInstance.close($scope.item);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

    $scope.toggleVegan = function () {
        $scope.item.vegan=!$scope.item.vegan
    };

    $scope.toggleGlutenFree = function () {
        $scope.item.gluten_free=!$scope.item.gluten_free
    }
}]);
app.service('API', ['$http', function($http){
    var self = this;

    this.getSections = function (cb) {
        if (!cb) cb = function(){};
        $http.get('/sections').success(function (sections) {
            cb(sections);
        })
    };

    this.addSection = function (section, cb) {
        if (!cb) cb = function(){};
        $http.post('/admin/section', section).success(function (section) {
            cb(section);
        })
    };

    this.addItem = function (item, section, cb) {
        if (!cb) cb = function(){};
        item.section=section;
        $http.post('/admin/items', item).success(function (item) {
            cb(item);
        })
    };

    this.deleteItem = function (id, cb) {
        if (!cb) cb = function(){};
        $http.delete('/admin/item/'+id).success(function () {
            cb();
        })
    };
    return this;
}]);