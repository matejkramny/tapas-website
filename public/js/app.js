var deps = ['LocalStorageModule', 'ui.bootstrap'];
if (window.ngFileUpload) deps.push('ngFileUpload');

var app = angular.module('tapas', deps);

app.config(function (localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('tapas');
});

app.run(function ($rootScope, basketService) {
	$rootScope.basket = basketService;
});

app.controller('MenuCtrl', function ($scope, basketService) {
	$scope.addToBasket = function (id) {
		basketService.addItem(id);
	};
});

app.controller('configCtrl', ['$scope', 'clientAPI', function($scope, clientAPI) {
	$scope.config = {};
	clientAPI.getAllConfig(function (config) {
      $scope.config = config;
  });
}]);

app.controller('BasketCtrl', function ($scope, $http, $modal, $rootScope,  basketService, localStorageService) {
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

	$scope.ingredients = function(item) {
		var scope = $rootScope.$new();
		scope.item = item;
		$modal.open({
			scope: scope,
			controller: 'IngredientsInstanceCtrl',
			templateUrl: 'ingredients'
		});
	};

	$scope.submitOrder = function () {
		var items = [];
		for (var i = 0; i < basketService.items.length; i++) {
			items.push({
				id: basketService.items[i].id,
				quantity: basketService.items[i].quantity,
				ingredients: basketService.items[i].ingredients
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

app.controller('IngredientsInstanceCtrl', ['$scope', '$modalInstance',  function ($scope, $modalInstance) {
	$scope.ok = function () {
		$scope.item.ingredients = [];
		for (ingredient in $scope.item.obj.ingredients) {
			$scope.item.ingredients.push({id: $scope.item.obj.ingredients[ingredient]._id, value: $scope.item.obj.ingredients[ingredient].value})
		}
		$modalInstance.close();
	};

	$scope.setIngredientValues = function (ingredient, index) {
		if ("ingredients" in $scope.item) {
			ingredient.value = $scope.item.ingredients[index].value;
		} else {
			ingredient.value = ingredient.default_quantity;
		}
	};

	$scope.setIngredient = function (ingredient) {
		if (ingredient.value != 2) {ingredient.value = ingredient.value+1}
		else {ingredient.value=0}
	}
}]);

app.service('clientAPI', ['$http', function ($http) {
	this.getAllConfig = function (cb) {
      $http.get('/config').success(function (model) {
          cb(model);
      })
  }
}]);

app.service('basketService', function ($http, $rootScope, $modal, localStorageService) {
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
		var item = 0;
		for (var i = 0; i < self.items.length; i++) {
			item = self.items[i];

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
			item = self.items.length-1;
			var scope = $rootScope.$new();
			self.getItems();
			scope.item = self.items[item];
			$modal.open({
				scope: scope,
				controller: 'IngredientsInstanceCtrl',
				templateUrl: 'ingredients'
			}).result.then(function() {
					self.save()
				});
		}
		console.log(self.items[item]);
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