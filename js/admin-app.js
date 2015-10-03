app.controller('AdminCtrl', ['$scope', '$modal', '$window', function ($scope, $modal, $window){
    $scope.editItem = function(id){
        $modal.open({
            templateUrl: "admin/item/"+id
        })
    };
    $scope.deleteItem = function(id){
        if ($window.confirm("Are you sure you would like to delete this item?")) {
            //TODO Make actionable delete in admin
            alert("WIP, This will delte item "+id);
        }
    };
    $scope.addItem = function(){
        $modal.open({
            templateUrl:"admin/additem"
        })
    };
    $scope.manageSections = function(){
        //TODO Manage sections
        alert("WIP");
    };
    $scope.orderLogs = function(){
        $modal.open({
            templateUrl:"admin/logs"
        })
    }
}]);