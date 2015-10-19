var deps = ['LocalStorageModule', 'ui.bootstrap', 'angucomplete-alt'];
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

app.controller('BasketCtrl', function ($scope, $http, $modal, $rootScope, $q, basketService, localStorageService) {
	try {
		$scope.customer = JSON.parse(localStorageService.get('customer'));
		if (!$scope.customer) throw Error();
	} catch (e) {
		$scope.customer = {};
	}
	basketService.getItems(function () {
		for (var i=0; i < basketService.items.length; i++) {
			$scope.totalPrice += basketService.items[i].obj.price;
		}
	});

	$rootScope.totalPrice=0;

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

		if (items.length == 0 || !$scope.postCodeValid) return;

		$scope.submitting = true;
		$http.post('/order', {
			items: items,
			customer: $scope.customer
		}).success(function (order) {
			$scope.submitting = false;
			window.location = '/confirm?order_id=' + order._id;
		}).error(function () {
			$scope.submitting = false;
			$scope.status = 'Order Failed.'
		})
	};
	$scope.postcodes = [];
	$scope.getPostcodes = function (entered, timeoutPromise) {
		var deferred = $q.defer();

		$http.get('https://api.postcodes.io/postcodes/'+entered+'/autocomplete', {timeout: timeoutPromise})
		.then(function (res) {
				var postcodes = res.data.result
				if (postcodes) {
					for (var i = 0; i < postcodes.length; i++) {
						postcodes[i] = {
							name: postcodes[i]
						};
					}

					if (postcodes.length == 0) {
						postcodes.push({
							name: entered
						})
					}
				}
				res.data.result = postcodes;
				deferred.resolve(res);
			}, function (e) {
			deferred.resolve({
				data: {
					result: [{
						name: entered
					}]
				}
			})
		});

		return deferred.promise;
	};
	$scope.verifyPostcode = function(postcode) {
		if (postcode != undefined) {
			if (postcode.title != undefined) {postcode = postcode.title;}
			else if (postcode.originalObject != undefined) {postcode = postcode.originalObject;}
			$http.get('https://api.postcodes.io/postcodes/'+postcode)
				.success(function (res) {
					$scope.postCodeValid=true;
					$scope.customer.postcode=res.result.postcode;
					$http.get('/distance/'+res.result.postcode).success(function (result) {
						if (result >3) $scope.deliveryCharge = Math.ceil(result)*0.5;
						else $scope.deliveryCharge = 1.5
					})
					$scope.saveCustomer();
				})
				.error(function () {
					$scope.postCodeValid=false;
					$scope.deliveryCharge = 0;
				});

		}
	};
	$scope.postcode=$scope.customer.postcode;
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

	this.getItems = function (cb) {
		this.items.forEach(function (item) {
			$http.get('/item/' + item.id).success(function (obj) {
				item.obj = obj;
				$rootScope.totalPrice += obj.price;
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

	this.itemHasIngredients = function (id, cb) {
		$http.get('/item/' + id).success(function (obj) {
			if (obj.ingredients.length && !window.mobilecheck()) cb();
		});
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
			self.itemHasIngredients(id, function () {
					$modal.open({
						scope: scope,
						controller: 'IngredientsInstanceCtrl',
						templateUrl: 'ingredients'
					}).result.then(function() {
						self.save()
					});
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

	var s = document.location.search.split('?order_id=');
	if (s.length < 1) {
		document.location = '/';
		return;
	}

	var sock = io.connect();
	sock.on(s[1], function (dat) {
		console.log(dat);
	});

	if (localStorageService.get('customer')) {
		$scope.customer = JSON.parse(localStorageService.get('customer'));
	}

	basketService.getItems();
	$rootScope.hasOrdered = true;

	localStorageService.set('basket_items', '[]');
});
window.mobilecheck = function() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}