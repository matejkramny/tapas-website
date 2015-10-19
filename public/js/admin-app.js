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
            templateUrl: 'editItem',
            size: 'lg'
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
    $scope.upload = function(item){
        var scope = $rootScope.$new();
        scope.item = item;
        $modal.open({
            scope: scope,
            controller: 'UploadInstanceCtrl',
            templateUrl: 'upload'
        }).result.then(function(item) {
                API.editItem(item, function () {
                    $scope.refresh();
                })
            });
    };
    $scope.addItem = function(section){
        var scope = $rootScope.$new();
        scope.section = section;
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            scope: scope,
            controller: 'AddItemInstanceCtrl',
            templateUrl: "addItem",
            size: 'lg'
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

    $scope.config = function(){
        $modal.open({
            controller: 'ConfigInstanceCtrl',
            templateUrl:"config"
        }).result.then(function(config) {
                for (key in config) {
                    API.setConfig(key, config[key]);
                }
                $window.location.reload();
            })
    }

}]);
app.controller('logsCtrl', ['$scope', '$rootScope', '$modal', '$window', 'API', function ($scope, $rootScope, $modal, $window, API) {
    var socket = io.connect();
    socket.on('order', function (dat) {
        $scope.orders.splice(0, 0, dat);
        new Audio('/bell.mp3').play();
        if (!$scope.$$phase) $scope.$digest();
    });

    $scope.getOrders = function ()  {
        API.getOrders(function (orders) {
            $scope.orders = orders;
        })
    };
    $scope.refresh = function () {
        $scope.getOrders();
    };
    $scope.refresh();
    $scope.orderStatus = function (status) {
        switch (status) {
            case 0:
                return "Waiting";
            case 1:
                return "Approved";
            case 2:
                return "Denied";
        }
    };
    $scope.statusClass = function (status) {
        switch (status) {
            case 0:
                return "fa-clock-o";
            case 1:
                return "fa-check";
            case 2:
                return "fa-times";
        }
    };
    $scope.changeStatus = function (order, status) {
        order.status=status;
        API.changeOrder(order._id, order);
    };

    $scope.viewOrder = function (order) {
        var scope = $rootScope.$new();
        scope.order = order;
        $modal.open({
            scope: scope,
            templateUrl: 'viewOrder',
            controller: 'viewOrderInstanceCtrl'
        }).result.then(function (status) {
                $scope.changeStatus(order, status);
            });
    };

    $scope.deleteOrder = function (id){
        if ($window.confirm("Are you sure you would like to delete this order?")) {
            API.deleteOrder(id, function () {
                $scope.refresh();
            });
        }
    }
}]);
app.controller('viewOrderInstanceCtrl', ['$scope', '$modalInstance', 'API', function ($scope, $modalInstance, API) {
    $scope.items = [];
    $scope.total = 0.0;
    var setItem = function (i) {
        API.getItem($scope.order.items[i].id, function (item) {
            $scope.items.push(item);
            $scope.total += item.price*$scope.order.items[i].quantity;
        });
    };
    for (var i = 0; i<$scope.order.items.length; i++) {
        setItem(i);
    }
    API.getDistance($scope.order.postcode, function (distance) {
        var delivery = distance > 3 ? Math.ceil(distance)*0.5 : 1.5;
        $scope.deliveryCost = delivery;
        $scope.total += delivery;
    });
    $scope.close = function (status) {
        $modalInstance.close(status);
    };
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

    $scope.addIngredient = function () {
        $scope.item.ingredients.push({name: "", default_quantity: 1});
    }

    $scope.setIngredient = function (value, index) {
        $scope.item.ingredients[index].default_quantity=value;
    }

    $scope.deleteIngredient = function (index) {
        $scope.item.ingredients.splice(index, 1);
    }

}]);
app.controller('ConfigInstanceCtrl', ['$scope', '$modalInstance', 'API', '$http', 'Upload', function ($scope, $modalInstance, API, $http, Upload) {
    $scope.config = {};
    $scope.ok = function () {
        $modalInstance.close($scope.config);
    };

    $scope.getValue = function(key) {
        $scope.config[key]="";
        API.getConfig(key, function (value) {
            if (value == "true" || value == "false") {
                $scope.config[key] = (value === "true");
            }
            else $scope.config[key] = value;
        })
    };

    $scope.toggle = function (key) {
        $scope.config[key] = !$scope.config[key];
    };

    $http.get('/config', config).success(function (config){
        $scope.config=config;
    });

    $scope.upload = function (files) {
        if (!files || !files.length) {
            return;
        }

        var file = files[0];
        var extension = file.name.split('.');
        if (extension.length > 0) {
            extension = extension[extension.length - 1];
        } else {
            extension = '';
        }
        var contentType = file.type != '' ? file.type : 'application/octet-stream';

        $http.put('/admin/config/promo/image', {
            extension: extension,
            contentType: contentType
        }).success(function (img) {
            $scope.upload = {
                progress: 0,
                finished: false
            }

            Upload.upload({
                url: img.url,
                method: 'POST',
                fields : {
                    key: img.name,
                    filename: img.name,
                    acl: 'public-read',
                    policy: img.policy,
                    signature: img.signature,
                    AWSAccessKeyId: img.AWSAccessKeyId,
                    "Content-Type": contentType
                },
                file: file
            }).progress(function (evt) {
                $scope.upload.progress = parseInt(100.0 * evt.loaded / evt.total);
            }).success(function (data, status, headers, config) {
                $scope.upload.progress = 100;
                $scope.upload.finished = true;
                $scope.config.promo_extension = extension;
            });
        });
    };
}]);
app.controller('AddItemInstanceCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
    $scope.item={};
    $scope.item.vegan=false;
    $scope.item.gluten_free=false;
    $scope.item.hidden=false;
    $scope.item.ingredients = [];
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

    $scope.addIngredient = function () {
        $scope.item.ingredients.push({name: "", default_quantity: 1});
    }

    $scope.setIngredient = function (value, index) {
        $scope.item.ingredients[index].default_quantity=value;
    }

    $scope.deleteIngredient = function (index) {
        $scope.item.ingredients.splice(index, 1);
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
app.controller('UploadInstanceCtrl', ['$scope', '$modalInstance', 'Upload', '$http', function ($scope, $modalInstance, Upload, $http) {
    $scope.upload = null;

    $scope.ok = function () {
        $modalInstance.close($scope.item)
    };

    $scope.upload = function (files) {
        if (!files || !files.length) {
            return;
        }

        var file = files[0];
        var extension = file.name.split('.');
        if (extension.length > 0) {
            extension = extension[extension.length - 1];
        } else {
            extension = '';
        }
        var contentType = file.type != '' ? file.type : 'application/octet-stream';

        $http.put('/admin/item/' + $scope.item._id + '/image', {
            extension: extension,
            contentType: contentType
        }).success(function (img) {
        $scope.upload = {
            progress: 0,
            finished: false
        }

            Upload.upload({
                url: img.url,
                method: 'POST',
                fields : {
                    key: img.name,
                    filename: img.name,
                    acl: 'public-read',
                    policy: img.policy,
                    signature: img.signature,
                    AWSAccessKeyId: img.AWSAccessKeyId,
                    "Content-Type": contentType
                },
                file: file
            }).progress(function (evt) {
                $scope.upload.progress = parseInt(100.0 * evt.loaded / evt.total);
            }).success(function (data, status, headers, config) {
                $scope.upload.progress = 100;
                $scope.upload.finished = true;
            });
        });
    };
}])
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

    this.getItem = function (id, cb) {
        if (!cb) cb = function(){};
        $http.get('/item/'+id).success(function (item) {
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

    this.getOrders = function (cb) {
        if (!cb) cb = function(){};
        $http.get('/admin/orders').success(function (orders) {
            cb(orders.reverse());
        })
    };

    this.changeOrder = function (id, order, cb) {
        if (!cb) cb = function(){};
        $http.put('/admin/order/'+id, order).success(function (order) {
            cb(order)
        })
    };

    this.deleteOrder = function (id, cb) {
      $http.delete('/admin/order/'+id).success(function () {
          cb()
      })
    };

    this.getDistance = function (postcode, cb) {
        $http.get('/distance/'+postcode).success(cb)
    };

    return this;
}]);