var app = angular.module('tapas', ['LocalStorageModule', 'ui.bootstrap']);

app.config(function (localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('tapas');
});

app.run(function ($rootScope, basketService) {
	$rootScope.basket = basketService;
});

app.controller('MenuCtrl', function ($scope, basketService) {
	$scope.addToBasket = function (id) {
		basketService.addItem(id);
	}
});

app.controller('configCtrl', ['$scope', 'clientAPI', function($scope, clientAPI) {
	$scope.config = {};
	var getValue = function(key) {
		$scope.config[key]="";
		clientAPI.getConfig(key, function (value) {
			if (value == "true" || value == "false") {
				$scope.config[key] = (value === "true");
			}
			else $scope.config[key] = value;
		})
	};
	var neededVals=['address', 'promo', 'openHours', 'name', 'twitter', 'facebook', 'instagram'];
	for (index in neededVals) {
		getValue([neededVals[index]])
	}
}]);

app.controller('BasketCtrl', function ($scope, $http, basketService, localStorageService) {
	try {
		$scope.customer = JSON.parse(localStorageService.get('customer'));
		if (!$scope.customer) throw Error();
	} catch (e) {
		$scope.customer = {};
	}

	basketService.getItems();

	$scope.saveCustomer = function () {
		localStorageService.set('customer', JSON.stringify($scope.customer));
	};

	$scope.submitOrder = function () {
		var items = [];
		for (var i = 0; i < basketService.items.length; i++) {
			items.push({
				id: basketService.items[i].id,
				quantity: basketService.items[i].quantity
			});
		}

		if (items.length == 0) return;

		$scope.submitting = true;
		$http.post('/order', {
			items: items,
			customer: $scope.customer
		}).success(function () {
			$scope.submitting = false;
			window.location = '/confirm';
		}).error(function () {
			$scope.submitting = false;
			$scope.status = 'Order Failed.'
		})
	}
});

app.service('clientAPI', ['$http', function ($http) {
	this.getConfig = function (key, cb) {
		$http.get('/config/'+key).success(function (model) {
			cb(model.value);
		});
	};
}]);

app.service('basketService', function ($http, localStorageService) {
	var self = this;

	try {
		this.items = JSON.parse(localStorageService.get('basket_items'));
		if (!this.items) throw Error("does not exist")
	} catch (e) {
		this.items = [];
	}

	this.calculateTotal = function () {
		self.totalItems = 0;
		self.items.forEach(function (item) {
			self.totalItems += item.quantity;
		});
	};

	this.calculateTotal();

	this.getItems = function () {
		this.items.forEach(function (item) {
			$http.get('/item/' + item.id).success(function (obj) {
				item.obj = obj;
			});
		});
	};

	this.remove = function (item) {
		for (var i = 0; i < self.items.length; i++) {
			if (self.items[i] == item) {
				self.items.splice(i, 1);
				self.calculateTotal();

				return;
			}
		}
	};

	this.addItem = function (id) {
		var found = false;

		for (var i = 0; i < self.items.length; i++) {
			var item = self.items[i];

			if (item.id != id) continue;

			item.quantity++;
			found = true;
			break;
		}

		if (!found) {
			self.items.push({
				id: id,
				quantity: 1
			});
		}

		self.save();
	};

	this.save = function () {
		self.calculateTotal();
		localStorageService.set('basket_items', JSON.stringify(self.items));
	};

	this.items.forEach(function (item) {
		if (!item.id) {
			self.remove(item);
			self.save();
			return;
		}
	});

	return this;
});

app.controller('ConfirmCtrl', function ($scope, $rootScope, localStorageService, basketService) {
	$scope.basket = basketService;

	if (localStorageService.get('customer')) {
		$scope.customer = JSON.parse(localStorageService.get('customer'));
	}

	basketService.getItems();
	$rootScope.hasOrdered = true;

	localStorageService.set('basket_items', '[]');
});