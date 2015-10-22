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

	$rootScope.totalPrice=0;
	basketService.getItems(function () {
		for (var i=0; i < basketService.items.length; i++) {
			$rootScope.totalPrice += basketService.items[i].obj.price*basketService.items[i].quantity;
		}
	});

	$scope.quantityInput = /^[1-9]\d*$/;

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
			window.location = '/confirm?order_id=' + order.secureID;
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
						if (result >2) $scope.deliveryCharge = Math.ceil(result)*0.5;
						else $scope.deliveryCharge = 1
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
				$rootScope.totalPrice += obj.price*item.quantity;
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
		$rootScope.totalPrice = 0;
		this.items.forEach(function (item) {
			$rootScope.totalPrice += item.quantity*item.obj.price;
		});
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

app.controller('ConfirmCtrl', function ($scope, $rootScope, $http, localStorageService, basketService) {
	$scope.basket = basketService;

	var s = document.location.search.split('?order_id=');
	if (s.length < 1) {
		document.location = '/';
		return;
	}

	var getOrderItem = function (i) {
		$http.get('/item/'+$scope.order.items[i].id).success(function (item) {
			$scope.order.items[i].obj = item;
		})
	};

	$scope.statusClass=function(status) {
		switch (status) {
			case 0:
				return "fa-refresh fa-spin";
			case 1:
				return "fa-check fa-c-accepted";
			case 2:
				return "fa-times fa-c-denied";
		}
	};

	$scope.statusText = function (status) {
		switch (status) {
			case 0:
				return "Waiting";
			case 1:
				return "Approved";
			case 2:
				return "Denied";
		}
	};

	$scope.statusIcon = function (status) {
		switch (status) {
			case 0:
				return "data:image/png;base64,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";
			case 1:
				return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWQAAAFkCAMAAAAgxbESAAABX1BMVEUAAAAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizAfizCsIV+5AAAAdHRSTlMAAQIDBAUGBwgJCgsMDQ4REhUXGBkiIyUpLC0vMzQ1OD0+R09UWV1eYWRmZ2hpa2xtb3Bxc3R1d3h5e3x+f4CCg4WGiImLjI6PkZWYnqClpqqvsrS1ubzAw8fIyszOz9HT1dfZ2tze4OLk5unv8fP19/n7/dmWWpAAAASGSURBVHja7d3pchVVFIDRJiQhgBOggqCtiOCIODAoKIOoOCCKgkNEFCcQFDHs9y//UGS6BELOPpo+63uB7r0qVTed2zm76yRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ0uptfGpqgkJiD+z6/O+IiJnzz2+ikdLmMzGnb7cRKd7YkVjQmUkqZVt/IRZ1bQuXkj14JUb0z2NkChpfjZHNPM4m25hyDWPKxYz/iKCc/ASypDHlGsaUaxhTrmFMuYYx5RrGlGsYU75v4ysRlHPbuCxjyjWMKdcwplzDmHINY8o1jCnXMKZ8z8aXIyj/n40p1zCOmPEddrpxxI3NHJdqQwHjiKveLUo3jjiNMt04YivMOxn/Xso4vqaZbhzxMM9043gOaLpxfEE03Tj+RJpuHDEGNd04/ItUvnGMY53X+t/KG8carunGl7mmG8fHYNONYyfZdOPwx8584w/Qzhr/mmN88yG22cbxAtt043N+SU43vuhpL9340jq4t5pizHgIxr8wZsyYMWPGjBkzvp829i+e+uz0yT3bK97e1M8tGa/ZOT17h19tZ5zQEwveUv1uC+PSP8ZHF9/nbsZFGzs76k5PZF92XUvGa8+PvtePGKcbJyszvtWpRONLjLOVGc/pQ8bpxkmvhTDOV2acr8x4RO8XNv6J8YhOMk43jniPcbpxQWXGS3SCcbpxIWXGd+l4AeMfGd+lYyu97CTjdGXG99RRxunGEe8yTjdegTLjZfQO43Tj+1SevNjS+xXnVj7XEcZL92mJyQ4zXqpny8x2mPEST7U3Ck33NuM7dqDYfG8tw/iHpozXzkR95caMu6dKzniI8ciOF53y4L1ccqI1467wF/EHGY94ECk96QHGiz/3is+6n/HCxqOu8sSF9oy7sYR532S8oOsJE7/BeH5no55yq8bd7pSpX2c8t005c782wvj7Vo27bjpn8n2M57Qjqig3bdx1XyZN/yrj2TZcz1du3bjrtiYBxN7bxtOtG3fdk1nKrzCerc9SfplxBeWXGNdQZlxB+S/GFZQZr1blVXuGXs+Y8iCMV43yKj9vs2dMeRDGq0B5EGfz9oxbVx7MGdM945aVB3VWes+4VeXBnfnfM25ReZC7K3rGrSkPdgdLz7gl5UHvEuoZt6I8+J1YPeMWlJvY7dYzHrpyMzsKe8ZDVm5q12bPeKjKze2M7RkPUbnJ3cc946EpN7vDu2c8JOWmd9H3jIei3LhxFeXmjSsoM85XZpyvzDhfmXG+MuN8Zcb5yozzlRnnKzPOV2acr8w4X5lxvjLjfGXG+cqM85UZ5yszzldmnK/MOF+Zcb4y43xlxvnKjPOVGecrM85XZpyvzDhfmXG+MuN8Zcb5yozzlRnnKzPOV2acr8w4X5lxvjLjfGXGRdtxc4Tx9CSYoj16eZHxJ2uxFG780Hziqz2ThDbuvXab+Jtn1gBJ6pGn9+w/vG/XNh94kiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiT9t/0LhCuJ0DYJfpwAAAAASUVORK5CYII=";
			case 2:
				return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWQAAAFkCAMAAAAgxbESAAABnlBMVEUAAACLHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx+LHx936MnmAAAAiXRSTlMAAQIDBAUGBwgJCgsMDQ4PERMUFRcYGRscHR8gISIjJSYnKistLi8wMjM0OD9AQUNFR0lKTU9QUlRWV1hbXGFiZmdrbG1vcHFzdHV3eXt+f4CIiYuMjpKVmJqeoKKjpaaoqquvsLK0t7m6vL7AwcPFyszOz9PV2tze4OLk5ujp6+3v8fP19/n7/QNGy6MAAAgCSURBVHja7d15cxRlFMXhnixkYwuCgCuigOzuuyKKCjSIiuICiAqoCGhEIYggMUiS+6219B+pLNPd8773nnv7/D7B6adSXZPpt3qKgjHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhcg6Mrx5ZhTusML1850u/ct/Po/ouz8m+/HHlyAGrb6J5Pbvw3bfrrl9e5JR599478v7kTa2G2bf7unmly/XmXf9D9B2V+J8cgtm2YmD9t+il/xg/dkoWafRrgJnZkwWlyacyZ8SuyWCc6xtOGflxs2p1NrowPy+Kds737LZ9cYttOR8bHZKl+sFRecXPJbbuDGJsqdzH2o9zN2FC5q7EX5e7GZsoVjH0oVzE2Uq5k7EG5mrGJckVjfOWqxgbKlY3RlasbqyvXMMZWrmOsrFzLGFm5nrGqck1jXOW6xorKtY1Rlesbqyk3MMZUbmKspNzIGFG5mbGKckNjPOWmxgrKjY3RlJsbZ1fuwRhLuRdjkQv9qMZIyr0ZZ1Xu0RhHuVfjjMo9G6Mo926cTTmBMYZyCuNMykmMEZTTGGdRTmRsr5zKOINyMmNr5XTGyZUTGtsqpzROrJzU2FI5rXFS5cTGdsqpjRMqJze2Uk5vnEw5g7GNcg7jRMpZjEV2qRsfFkFVzmQsskPZ+FURVOVsxjL3gKrxgyKoyvmMRf4YUjTuvyWoyjmNRc4oIr8nAqqc11hki5rxiAiocm5juaqGfEBAlbMbizyhZNyZFkxlBWM5pYT8iAiksoaxyKAO8psCqaxjLJt0kC8IorKSsbyhgzwjgMpaxvKpivGACJ6ymrH8HONTcgNlPWO5qYK8QuCUFY1lRgV5VNCUNY3ltgryoIApqxrLrzqfLuawlHWN5aQO8oTqRcn3/UjG8pbvJ0+NlLWNZZsO8lbBUVY3lhGl5yKzMMr6xhe1vk8+LiDK+sZ65wLWCIaygfHtPrVHI59DKBsYyzN6D1JHZgCULYwnNF9qt1vMlS2MZ8dVT7d8ZK1sYax95rDzla2yifE+7QOHfectlU2MDxZFm5TbYmyp3B5jO+U2GVspr2+VsZGytMu4Ncqmxi1RNjZuhbK5cQuUAYzDK0MYB1cGMQ6tDGMcWBnIOKwylHFQ5UNFQeW2GQdUBjQOpwxpHEwZ1DiUMqxxIGVg4zDK0MZBlMGNQyjDGwdQdmDsXtmFsXNlJ8auld0YO1Z2ZOxW2ZWxU+XDRUFlGrtXdmjsTtmlsTNlp8aulN0aO1J2bOxG2bWxE2Xnxi6U3Rs7UA5gDK8cwhhcOYgxtHIYY2DlQMawyqGMQZWDGUMqhzMGVA5oDKcc0hhMOagxlHJYYyDlwMYwyqGNQZSDG0MohzcGUG6BsblyK4yNlVtibKrcGmND5RYZmym3yrgo7rcwnh5olbHJO027/sIRjansxLhFyobGrVE2NW6JsrFxK5TNjVugDGAcXhnCOLgyiHFoZRjjwMpAxmGVoYyDKoMZh1SGMw6oDGgcTnklonEwZVDjUMqwxoGUgY3DKEMbB1EGNw6hDG8cQNmBsXtlF8bOlZ0Yu1Z2Y+xY2ZGxW2VXxk6VnRm7VHZn7FB55S0RKtPYu7JTY1fKbo0dKTs2dqPs2tiJsnNjF8rujR0oBzCGVw5hDK4cxBhaOYwxsHIgY1jlUMagysGMIZXDGQMqBzSGUw5pDKYc1BhKOawxkHJgYxjl0MYgysGNIZTDGwMot8DYXLkVxsbKJsZ/tkvZxLjsP98mZRtjo7epGilbGbdJ2c64PcorDI2tlPuUjYevWxobKZ/pqBp3frI1NlJ+XxX5qLWxkfIOReON9sY2ylOKL2yfADC2Udb76YHNEMYmynNDWsjfYhibKL+uZDyKYmyhPKmEvAvG2EJ5tQ7yxzjGBsq7dJAngYz/UT6nO+eIzn97UMbqymdVkIewjLWVr6kgj4EZKytPqyAvRzPWVb6r8y0nnLGq8m8qyP14xprKl3Q+wk3hGSsqf6iD/CWgsZ7yCzrILyIaqymv10G+D9JYSfkvred81yCNdZSPaX2f/CymsYryWi3kvmlMYwXlb/Se8e0FNc6vPK74uPoCqHFu5bc1z12MTIMa51W+qHuE6OE5UOOcyjeGlQ/DbUc1zqc8tarQbieqcS7lqfGiCKFcppmWQ9nEOIdymWpaemUj4/TKZbppqZXNjFMrlymnpVU2NE6rXKadllLZ1Dilcpl6WjplY+N0ymX6aamUzY1TKZc5pqVRBjBOo1zmmZZCGcI4hXKZa1rvyiDGvSuX+ab1qgxj3KtymXNab8pAxr0pl3mn9Z0NYtyLcpl7WnNlMOPmymX+aU2V4YybKpca05opAxo3Uy51pjVRhjRuolxqTauvDGpcX7nUm1ZXGda4rnKpOa2eMrBxPeVSd1odZWjjOsql9rTqyuDG1ZVL/WlVleGNqyqXFtOqKTswrqZc2kyrouzCuIpyaTWtu7IT4+7Kpd20bspujLspl5bTllZ2ZFwUW5c4WbvfdlrniyXOxq4qPLVhsVd5zu0131YuZnxpuPDVstMLXseVNQDbtt1ecNuBTuGuLVfn3/Kew7iOgUPzb2dnxwuXPX7qnsu4vKcPZtrQa/e8SenuB+sKtw0+tu+zK3/MTl09/c72UbBtq3cfPT95Z+b3y8df2tgpGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjCH1NwJbfubMWxhuAAAAAElFTkSuQmCC";
		}
	}

	$http.get('/order/' + s[1]).success(function (datorder) {
		$scope.order = datorder;
		for (var i = 0;i<$scope.order.items.length;i++) {
			getOrderItem(i)
		}
	}).error(function (blah) {
		// yeah
	});
	var updates = 0;
	var Notification = window.Notification || window.mozNotification || window.webkitNotification;
	Notification.requestPermission();
	var sock = io.connect();
	sock.on(s[1], function (dat) {
		$scope.order = dat;
		for (var i = 0;i<$scope.order.items.length;i++) {
			getOrderItem(i)
		}
		updates++;
		$scope.$apply();
		if (updates>0) {
			new Notification(
				"Order "+$scope.statusText(dat.status), {
					body: "You order at Tapas is "+$scope.statusText(dat.status),
					icon: $scope.statusIcon(dat.status)
				});
		}
	});

	if (localStorageService.get('customer')) {
		$scope.customer = JSON.parse(localStorageService.get('customer'));
	}

	$rootScope.hasOrdered = true;

	localStorageService.set('basket_items', '[]');
});
window.mobilecheck = function() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}