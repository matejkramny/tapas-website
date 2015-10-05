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
        }).result.then(function(item) {
            API.editItem(item, function () {
                $scope.refresh();
            })
        });
    };
    $scope.editSection = function(section) {
        var scope = $rootScope.$new();
        scope.section = section;
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            scope: scope,
            controller: 'EditSectionInstanceCtrl',
            templateUrl: 'editsection'
        }).result.then(function(section) {
            API.editSection(section, function () {
                $scope.refresh();
            });
        })
    };
    $scope.deleteItem = function(id){
        if ($window.confirm("Are you sure you would like to delete this item?")) {
            API.deleteItem(id, function () {
                $scope.refresh();
            });
        }
    };
    $scope.deleteSection = function(id){
        if ($window.confirm("Are you sure you would like to delete this section and all its items?")) {
            API.deleteSection(id, function () {
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
            API.addItem(item, section, function () {
                $scope.refresh();
            });
        })
    };
    $scope.addSection = function(){
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            controller: 'AddSectionInstanceCtrl',
            templateUrl: 'addsection'
        }).result.then(function(section) {
            API.addSection(section, function () {
                $scope.refresh();
            })
        })
    };
    $scope.orderLogs = function(){
        $modal.open({
            templateUrl:"/admin/logs"
        })
    };
}]);
app.controller('EditItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close($scope.item);
        $scope.refresh();
    };

    $scope.toggleVegan = function () {
        $scope.item.vegan=!$scope.item.vegan
    };

    $scope.toggleGlutenFree = function () {
        $scope.item.gluten_free=!$scope.item.gluten_free
    }
}]);
app.controller('AddItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

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
app.controller('AddSectionInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close($scope.section);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

}]);
app.controller('EditSectionInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close($scope.section);
    };

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
        $http.post('/admin/sections', section).success(function (section) {
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

    this.editItem = function (item, cb) {
        if (!cb) cb = function(){};
        $http.put('/admin/item/'+item._id, item).success(function (item) {
            cb(item);
        })
    };

    this.editSection = function (section, cb) {
        if (!cb) cb = function(){};
        $http.put('/admin/section/'+section._id, section).success(function (item) {
            cb(item);
        })
    };

    this.deleteSection = function (id, cb) {
        if (!cb) cb = function(){};
        $http.delete('/admin/section/'+id).success(function (section) {
            cb(section)
        })
    };

    this.deleteItem = function (id, cb) {
        if (!cb) cb = function(){};
        $http.delete('/admin/item/'+id).success(function (item) {
            cb(item);
        })
    };
    return this;
}]);