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

    $scope.config = function(){
        $modal.open({
            controller: 'ConfigInstanceCtrl',
            templateUrl:"config"
        }).result.then(function(config) {
                API.setConfig("promo", config.promo);
                API.setConfig("address", config.promo);
            })
    }

}]);
app.controller('EditItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close($scope.item);
    };

    $scope.toggleVegan = function () {
        $scope.item.vegan=!$scope.item.vegan
    };

    $scope.toggleGlutenFree = function () {
        $scope.item.gluten_free=!$scope.item.gluten_free
    }

    $scope.toggleHidden = function () {
        $scope.item.hidden=!$scope.item.hidden
    }
}]);
app.controller('ConfigInstanceCtrl', ['$scope', '$modalInstance', 'API', function ($scope, $modalInstance, API) {
    $scope.config = {};
    $scope.ok = function () {
        $modalInstance.close($scope.config);
    };

    var getValue = function(key) {
        $scope.config[key]="";
        API.getConfig(key, function (value) {
            $scope.config[key] = value;
        })
    };

    getValue("test");
}]);
app.controller('AddItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
    $scope.item={};
    $scope.item.vegan=false;
    $scope.item.gluten_free=false;
    $scope.item.hidden=false;
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
    };

    $scope.toggleHidden = function () {
        $scope.item.hidden=!$scope.item.hidden
    }
}]);
app.controller('AddSectionInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
    $scope.section={};
    $scope.section.hidden = false;
    $scope.ok = function () {
        $modalInstance.close($scope.section);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

    $scope.toggleHidden = function () {
        $scope.section.hidden=!$scope.section.hidden
    }

}]);
app.controller('EditSectionInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close($scope.section);
    };

    $scope.toggleHidden = function () {
        $scope.section.hidden=!$scope.section.hidden
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

    this.getConfig = function (key, cb) {
        $http.get('/config/'+key).success(function (model) {
            cb(model.value);
            console.log(model.value);
        });
    };

    this.setConfig = function (key, value, cb) {
        if (!cb) cb = function(){};
        input={value: value};
        $http.put('/admin/config/'+key, input).success(function () {
            cb();
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