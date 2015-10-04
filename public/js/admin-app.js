app.controller('AdminCtrl', ['$scope', '$modal', '$window', function ($scope, $modal, $window){
    $scope.editItem = function(id){
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            controller: 'EditItemInstanceCtrl',
            templateUrl: "/admin/item/"+id
        })
    };
    $scope.deleteItem = function(id){
        if ($window.confirm("Are you sure you would like to delete this item?")) {
            //TODO Make actionable delete in admin
            alert("WIP, item #"+id);
        }
    };
    $scope.addItem = function(){
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            controller: 'AddItemInstanceCtrl',
            templateUrl:"/admin/additem"
        })
    };
    $scope.manageSections = function(){
        $modal.open({
            templateUrl: '/admin/sections'
        })
    };
    $scope.orderLogs = function(){
        $modal.open({
            templateUrl:"/admin/logs"
        })
    }
}]);
app.controller('EditItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
    $scope.attrs = ['v', 'g'];
    $scope.toggleObject = {item: -1};

    $scope.ok = function () {
        //TODO Get values
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

    $scope.toggleVegan = function() {
        $scope.isVegan=!$scope.isVegan;
    };

    $scope.toggleGlutenFree = function() {
        $scope.isGlutenFree=!$scope.isGlutenFree;
    }
}]);
app.controller('AddItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

    $scope.toggleVegan = function() {
        $scope.isVegan=!$scope.isVegan;
    };

    $scope.toggleGlutenFree = function() {
        $scope.isGlutenFree=!$scope.isGlutenFree;
    }

}]);