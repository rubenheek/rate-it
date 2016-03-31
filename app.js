//-----------------------------------------------------------------------------some  stuff-----------------------------------------------------------------
var firebaseURL = 'http://rate-it.firebaseio.com/';
var redirect = false;
var app = angular.module('app', ['ngMaterial', 'firebase', 'ngRoute', '720kb.socialshare']);

app.directive('rateItUser', function($firebaseObject) {
	return {
		template :'<md-list>'+
					'<md-list-item>'+
					 '<img class="md-avatar" ng-src="{{userObject.profilePictureUrl}}"/>'+
					 '<p class="inline">{{name || userObject.name}}</p>'+
					 '<span ng-transclude></span>'+
					'</md-list-item>'+
				   '</md-list>',
		scope : {
			userId: '@uid',
			ownId: '@ownuid'
		},
		transclude: true,
		link : function(scope) {
			var userRef = new Firebase(firebaseURL + "/users/" + scope.userId);
			if(scope.userId == scope.ownId) {
				scope.userObject = $firebaseObject(userRef);
				scope.name = "You";
			} else {
				scope.userObject = $firebaseObject(userRef);
				scope.url = scope.userObject.profilePictureUrl;
			}
		}
	}
});

app.directive('rateItUsername', function($firebaseObject) {
	return {
		template: '{{userObject.$value || "You"}}',
		scope: {
			userId: '@uid',
			ownId: '@ownuid'
		},
		link : function(scope) {
			if(scope.userId !== scope.ownId) {
				var userRef = new Firebase(firebaseURL + "/users/" + scope.userId + "/name");
			    scope.userObject = $firebaseObject(userRef);
			}
		}
	}
});

app.directive('rateItUsericon', function($firebaseObject) {
	return {
		template: '<img class="rate-it-small-icon" ng-src="{{userObject.profilePictureUrl}}"/>',
		scope: {
			userId: '@uid'
		},
		link : function(scope) {
			var userRef = new Firebase(firebaseURL + "/users/" + scope.userId);
			scope.userObject = $firebaseObject(userRef);
		}
	}
});

app.directive('rateItFeedback', function() {
	return {
		template: '<div ng-repeat="(key, rating) in eventObject.ratings" as test>'+
				   '<md-button ng-if="results.length" ng-click="show[key] = !show[key]">'+
					'<rate-it-user uid="{{key}}" ownuid="{{ownuid}}">'+
					 '<i ng-if="!show[key]" class="material-icons">expand_more</i>'+
					 '<i ng-if="show[key]" class="material-icons">expand_less</i>'+
					'</rate-it-user>'+
				   '</md-button>'+
					'<div ng-repeat="item in rating[type] | filter:{deleted:false} as results track by $index" ng-show="show[key]">'+
					'<p class="tab">{{item.description}}</p>'+
				   '</div>'+
				  '</div>',
		scope: {
			type: '@type',
			eventObject: '=object',
			ownuid: "@ownuid"
		},
		link: function(scope) {
			scope.show = {};
		}
	}
});

app.directive('rateItScore', function() {
	var colorRanges = {
		0: {r : 232, g: 29, b: 98},
		5: {r : 254, g: 86, b: 33},
		6: {r : 204, g: 219, b: 56},
		10: {r : 76, g: 175, b: 80}
	}

	function getColorIndex(start, end, score, scale) {
		if (start > end) {
			return parseInt(start - (((start - end) / scale) * score));
		} else {
			return parseInt(start + (((end - start) / scale) * score));
		}
	};

	function getRgb(score, scale) {
		var startColor, endColor, rgb;
		var colorRangeComparison = parseInt(score);
		angular.forEach(colorRanges, function(color, colorRange) {
			if (colorRange == colorRangeComparison) {
				rgb = color;
				return;
			} else if (colorRange < colorRangeComparison) {
				startColor = color;
			} else if (!endColor && (colorRange > colorRangeComparison)) {
				endColor = color;
			}
		});
		if (!rgb && startColor && endColor) {
			rgb = {
				r : getColorIndex(startColor.r, endColor.r, score, scale),
				g: getColorIndex(startColor.g, endColor.g, score, scale),
				b : getColorIndex(startColor.b, endColor.b, score, scale),
			}
		}
		return rgb;
	};

	return {
		template: '<span>{{rating || "..."}}</span>',
		scope: { 
			score: '=score'
		},
		link: function(scope, element) {
			scope.$watch('score', function(score) {
				if(score) {
					var rgb = getRgb(score, 10);
					if (rgb) {
						element.css('color', 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')');
					}
					scope.rating = (Math.round( score * 10 ) / 10).toFixed(1);
				} else {
					scope.rating = null;
					element.css('color', 'rgb(0,0,0)');
				}
			});
		}
	}
});

//-----------------------------------------------------------------------------path configuration----------------------------------------------------------
app.config(function($routeProvider) {
	$routeProvider
	.when('/dashboard', {
		templateUrl: 'dashboard.html',
		controller: 'dashboardController'
	})
	.when('/:eventId/overview', {
		templateUrl: 'overview.html',
		controller: 'overviewController'
	})
	.when('/:eventId/rate', {
		templateUrl: 'ratingMenu.html',
		controller: 'ratingMenuController'
	})
	.otherwise({
		templateUrl: 'start.html',
		controller: 'indexController'
	});
});

//-----------------------------------------------------------------------------indexController-------------------------------------------------------------
app.controller('indexController', function($scope, $location, $mdToast, $mdDialog) {
	
	var authRef = new Firebase(firebaseURL);

	authRef.onAuth(function(authData) {
		$scope.$evalAsync(function() {
			$scope.authData = authData;
			if(authData !== null) {
				$location.path('/dashboard');
			}
		});
	});

	$scope.showSignUpDialog = function() {
		$mdDialog.show({
			controller: signUpController,
			templateUrl: 'signUpDialog.html',
			parent: angular.element(document.body)
		})
		.then(function(Email) {
			if(Email) {
				$scope.Email = Email;
			}
		})
	}

	$scope.loginWithEmail = function(email, password) {
		authRef.authWithPassword({
			email: email,
			password: password
		}, function(error, authData) {
			if (error) {
				showToast("Something went wrong");
			} else {
				showToast("Logged in");
			}
		});
	}

	function showToast(content) {
		$mdToast.show(
			$mdToast.simple()
				.content(content)
				.position('left bottom')
				.hideDelay(5000)
		);
	}

	$scope.loginWithFacebook = function() {
		authRef.authWithOAuthPopup("facebook", function(error, authData) {
			if(error) {
				showToast("Something went wrong");
			} else {
				showToast("Logged in");
			}
		});
	};

});

//-----------------------------------------------------------------------------signUpController------------------------------------------------------------
function signUpController($scope, $mdToast, $mdDialog) {

	var authRef = new Firebase(firebaseURL);

	$scope.cancel = function() {
		$mdDialog.hide();
	}

	$scope.signUp = function(email, password) {
		authRef.createUser({
			email: email,
			password: password
		}, function(error, userData) {
			if(error) {
				showToast("Something went wrong");
			} else {
				showToast("Succesfully created account")
				$mdDialog.hide($scope.email);
			}
		});
	}

	function showToast(content) {
		$mdToast.show(
			$mdToast.simple()
				.content(content)
				.position('left bottom')
				.hideDelay(5000)
		);
	}

}

//-----------------------------------------------------------------------------dashboardController----------------------------------------------------------
app.controller('dashboardController', function($scope, $firebaseObject, $firebaseArray, $timeout, $location, $mdDialog, $q){	
	
	var authRef = new Firebase(firebaseURL);
	$scope.selectedTabIndex = 0;

	authRef.onAuth(function(authData) {
		$scope.$evalAsync(function() {
			$scope.authData = authData;

			if(authData !== null) {
				if(authData.provider === "facebook") {
					addUserData(authData.uid, authData.facebook.displayName, authData.facebook.cachedUserProfile.picture.data.url, authData.provider);
				} else if(authData.provider === "password") {
					addUserData(authData.uid, authData.password.email, authData.password.profileImageURL, authData.provider);
				}
				var eventsRef = new Firebase(firebaseURL + "users/" + $scope.authData.uid + "/events");
				$scope.events = $firebaseArray(eventsRef);
				$scope.events.$loaded(function() {
					bindMyEventsToScope(authData.uid);
				});
			} else {
				if($scope.logoutClicked === true) {
					$location.path('#/');
					$scope.logoutClicked = false;
				} else {
					showContinueDialog("");
				}
			}
		});
	});

	$scope.logout = function() {
		authRef.unauth();
		$scope.logoutClicked = true;
	}

	function bindMyEventsToScope() {
		var promises = $scope.events.map(function(eventData) {
			return getObjectData('events/' + eventData.$value);
		});
		$q.all(promises).then(function(events) {
			$scope.myEvents = events;
			$scope.loadedEvents = true;
		});
	}

	function getObjectData(path, bindTo) {
		var eventRef = new Firebase(firebaseURL + path);
		var eventObject = $firebaseObject(eventRef);
		if(bindTo) {
			eventObject.$bindTo($scope, bindTo);
		}
		return eventObject.$loaded();
	}

	function showContinueDialog(Email) {
		$mdDialog.show({
			controller: continueDialogController,
			templateUrl: 'continueDialog.html',
			parent: angular.element(document.body),
			locals: {Email: Email}
		});

	}

	function addUserData(uid, name, imageUniformResourceLocatorSpecialThanksToBenjamin, provider) {
		getObjectData('users/' + uid, 'userObject').then(function() {
			if(provider === "password") {
				$scope.userObject.name = name.split('@')[0];
			} else if(provider === "facebook") {
				$scope.userObject.name = name;
			}
			$scope.userObject.profilePictureUrl = imageUniformResourceLocatorSpecialThanksToBenjamin;
			$scope.userObject.provider = provider;
		});
	}

	$scope.linkToPage = function(id, path) {
		$location.path(id + path);
	}

	$scope.showCreateEventDialog = function() {
		$mdDialog.show({
			controller: createEventDialogController,
			templateUrl: 'createEventDialog.html',
			parent: angular.element(document.body),
			locals: {uid: $scope.authData.uid}
		})
		.then(function() {
			if($scope.events.length < 2) {
				bindMyEventsToScope();
			}
		});
	}

	$scope.showJoinEventDialog = function() {
		$mdDialog.show({
			controller: joinEventDialogController,
			templateUrl: 'joinEventDialog.html',
			parent: angular.element(document.body)
		});

	}

	$scope.showShareDialog = function(eventId) {
		$mdDialog.show({
			controller: shareDialogController,
			templateUrl: 'shareDialog.html',
			parent: angular.element(document.body),
			locals: {eventId: eventId}
		})
	}

	$scope.order = function(orderFilter, reverse) {
		$scope.orderFilter = orderFilter;
		$scope.reverse = reverse;
	}

	$scope.filterOwner = function(ownerFilter, not) {
		if(not) {
			$scope.ownerFilter = '!' + ownerFilter;
			setCurrentFilterClass('', '', 'md-primary');
		} else if(ownerFilter === $scope.authData.uid) {
			$scope.ownerFilter = ownerFilter;
			setCurrentFilterClass('', 'md-primary', '');
		} else {
			$scope.ownerFilter = ownerFilter;
			setCurrentFilterClass('md-primary', '', '');
		}
	}

	function setCurrentFilterClass(classAll, classOwn, classOthers) {
		$scope.classAll = classAll;
		$scope.classOwn = classOwn;
		$scope.classOthers = classOthers;
	}

	$scope.setCurrentSortClass = function(classMR, classLR, classAZ, classZA) {
		$scope.classMR = classMR;
		$scope.classLR = classLR;
		$scope.classAZ = classAZ;
		$scope.classZA = classZA;
	}

	$scope.deleteEvent = function(eventId) {
		var confirm = $mdDialog.confirm()
			.title("Warning")
			.content("Please confirm if you want to delete this event from your events")
			.cancel("Cancel")
			.ok("Confirm");
		$mdDialog.show(confirm).then(function() {
			for(i=0; i<$scope.events.length; i++) {
				if($scope.events[i].$value === eventId) {
					$scope.events.$remove($scope.events[i]);
				}
				
			}
		});
	}

	$scope.tabs = {
		next: function() {
			$scope.selectedTabIndex = Math.min($scope.selectedTabIndex + 1, 2);
		},
		previous: function() {
			$scope.selectedTabIndex = Math.max($scope.selectedTabIndex - 1, 0);
		}
	}

	$scope.$watchCollection('userObject.events', function(oldValue, newValue){
		if(newValue == null) {return;}
 	 	bindMyEventsToScope();
	}, true);

	$scope.order('creationDate', true);
	setCurrentFilterClass('md-primary', '', '');
	$scope.setCurrentSortClass('md-primary', '', '', '');

});

//-----------------------------------------------------------------------------createEventDialogController-------------------------------------------------
function createEventDialogController($scope, $firebaseArray, $firebaseObject, $location, $mdDialog, $mdToast, uid) {

	$scope.cancel = function() {
		$mdDialog.cancel();
	}

	function getObjectData(path, bindTo) {
		var eventRef = new Firebase(firebaseURL + path);
		var eventObject = $firebaseObject(eventRef);
		if(bindTo) {
			eventObject.$bindTo($scope, bindTo);
		}
		return eventObject.$loaded();
	}

	function createEventId() {
		var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
		var Id = "";
		for(i=0; i<7; i++) {
			Id += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return Id;
	}

	$scope.checkEventId = function() {
		var testId = createEventId();
		getObjectData('events/' + testId, 'object').then(function(event) {
			if (event.$value === null) {
				$scope.eventId = testId;
			} else {
				$scope.checkEventId();
			}
		});
	}

	$scope.startEvent = function(eventName) {
		addEventData(eventName).then(function() {
			addCreatedEventToUser().then(function() {
				$mdDialog.hide();
				showToast("Event created");
			});
		});
	}

	function addEventData(eventName) {
		return getObjectData('events/' + $scope.eventId, 'eventObject').then(function() {
			if(!$scope.eventObject.participants) {
				$scope.eventObject.participants = [];
			}
			$scope.eventObject.eventName = eventName;
			$scope.eventObject.ownerId = uid;
			var date = new Date();
			var dateString = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
			$scope.eventObject.creationDate = dateString;
		});
	}

	function addCreatedEventToUser() {
		var eventsRef = new Firebase(firebaseURL + "users/" + uid + "/events");
		$scope.events = $firebaseArray(eventsRef);
		return $scope.events.$loaded(function() {
			$scope.events.$add($scope.eventId);
		});
	}

	function showToast(content) {
		$mdToast.show(
			$mdToast.simple()
				.content(content)
				.position('left bottom')
				.hideDelay(5000)
		);
	}

	$scope.eventId = $scope.checkEventId();

}

//-----------------------------------------------------------------------------joinEventDialogController---------------------------------------------------
function joinEventDialogController($scope, $firebaseObject, $location, $mdDialog) {

	$scope.cancel = function() {
		$mdDialog.cancel();
	}

	function getObjectData(path, bindTo) {
		var eventRef = new Firebase(firebaseURL + path);
		var eventObject = $firebaseObject(eventRef);
		if(bindTo) {
			eventObject.$bindTo($scope, bindTo);
		}
		return eventObject.$loaded();
	}

	$scope.checkJoinId = function() {
		getObjectData('events/' + $scope.joinId.toLowerCase()).then(function(event) {
			if(event.$value === null) {
				$scope.wrongJoinId = true;
			} else {
				$mdDialog.hide();
				$location.path($scope.joinId.toLowerCase() + '/rate');
			}
		});
	}

}

//-----------------------------------------------------------------------------overviewController---------------------------------------------------------
app.controller('overviewController', function($scope, $firebaseObject, $firebaseArray, $timeout, $mdToast, $mdDialog, $location, $route) {

	var authRef = new Firebase(firebaseURL);

	authRef.onAuth(function(authData) {
		$scope.$evalAsync(function() {
			$scope.authData = authData;
			if(authData !== null) {
				if(authData.provider === "facebook") {
					addUserData(authData.uid, authData.facebook.displayName, authData.facebook.cachedUserProfile.picture.data.url, authData.provider);
				} else if(authData.provider === "password") {
					addUserData(authData.uid, authData.password.email, authData.password.profileImageURL, authData.provider);
				}
			} else {
				if($scope.logoutClicked === true) {
					$location.path('#/');
					$scope.logoutClicked = false;
				} else {
					showContinueDialog("");
				}
			}
		});
	});

	$scope.logout = function() {
		authRef.unauth();
		$scope.logoutClicked = true;
	}

	function getObjectData(path, bindTo) {
		var eventRef = new Firebase(firebaseURL + path);
		var eventObject = $firebaseObject(eventRef);
		if(bindTo) {
			eventObject.$bindTo($scope, bindTo);
		}
		return eventObject.$loaded();
	}

	$scope.linkToDashboard = function() {
		$location.path('/dashboard');
	}

	function showToast(content) {
		$mdToast.show(
			$mdToast.simple()
				.content(content)
				.position('left bottom')
				.hideDelay(5000)
		);
	}

	$scope.showShareDialog = function(eventId) {
		$mdDialog.show({
			controller: shareDialogController,
			templateUrl: 'shareDialog.html',
			parent: angular.element(document.body),
			locals: {eventId: eventId}
		})
	}

	function showContinueDialog(Email) {
		$mdDialog.show({
			controller: continueDialogController,
			templateUrl: 'continueDialog.html',
			parent: angular.element(document.body),
			locals: {Email: Email}
		});

	}

	function addUserData(uid, name, imageUniformResourceLocatorSpecialThanksToBenjamin, provider) {
		getObjectData('users/' + uid, 'userObject').then(function() {
			if(provider === "password") {
				$scope.userObject.name = name.split('@')[0];
			} else if(provider === "facebook") {
				$scope.userObject.name = name;
			}
			$scope.userObject.profilePictureUrl = imageUniformResourceLocatorSpecialThanksToBenjamin;
			$scope.userObject.provider = provider;
		});
	}

	$scope.tabs = {
		next: function() {
			$scope.selectedTabIndex = Math.min($scope.selectedTabIndex + 1, 2);
		},
		previous: function() {
			$scope.selectedTabIndex = Math.max($scope.selectedTabIndex - 1, 0);
		}
	}

	$scope.$watchCollection('eventObject.participants', function(newValue, oldValue){
		if(oldValue == null || oldValue == newValue) {return;}
	 	getObjectData("/users/" + newValue[newValue.length - 1]).then(function(response) {
	 	 	showToast(response.name + " has joined");
	 	 });
	});

	$scope.$watch('eventObject.ratings', function(newValue) {
		if(newValue == null) {return;}
		var ratings = newValue;
		var tips = 0;
		var tops = 0;
		for(var key in ratings) {
			if(ratings[key].tips != null) {
				tips += ratings[key].tips.filter(function(tip) {return !tip.deleted}).length;
			}
			if(ratings[key].tops != null) {
				tops += ratings[key].tops.filter(function(top) {return !top.deleted}).length;
			}
		}
		$scope.tips = tips;
		$scope.tops = tops;
	});

	$scope.selectedTabIndex = 0;
	getObjectData('events/' + $route.current.params.eventId, 'eventObject').then(function(){
		if(!$scope.eventObject.ownerId) {
			showToast("Unknown event");
			$location.path('/dashboard');
		} else {
			$scope.loaded = true;
		}
	});

});

//-----------------------------------------------------------------------------shareDialogController-------------------------------------------------------
function shareDialogController($scope, $mdDialog, eventId) {

	$scope.cancel = function() {
		$mdDialog.cancel();
	}

	$scope.shareLink = "http://rate-it.firebaseapp.com/#/" + eventId + "/rate";
}

//-----------------------------------------------------------------------------ratingMenuController--------------------------------------------------------
app.controller('ratingMenuController', function($scope, $firebaseObject, $firebaseArray, $location, $route, $mdDialog, $mdToast) {

	var authRef = new Firebase(firebaseURL);
	authRef.onAuth(function(authData) {
		$scope.$evalAsync(function() {
			$scope.authData = authData;
			if(authData !== null) {
				if(authData.provider === "facebook") {
					addUserData(authData.uid, authData.facebook.displayName, authData.facebook.cachedUserProfile.picture.data.url, authData.provider);
				} else if(authData.provider === "password") {
					addUserData(authData.uid, authData.password.email, authData.password.profileImageURL, authData.provider);
				}
				loadData(authData.uid);
			} else {
				if($scope.logoutClicked === true) {
					$location.path('#/');
					$scope.logoutClicked = false;
				} else {
					showContinueDialog("");
				}
			}
		});
	});

	$scope.logout = function() {
		authRef.unauth();
		$scope.logoutClicked = true;
	}

	function getObjectData(path, bindTo) {
		var eventRef = new Firebase(firebaseURL + path);
		var eventObject = $firebaseObject(eventRef);
		if(bindTo) {
			eventObject.$bindTo($scope, bindTo);
		}
		return eventObject.$loaded();
	}

	$scope.linkToDashboard = function() {
		$location.path('/dashboard');
	}

	$scope.addTip = function() {
		if(!$scope.ratingsObject.tips) {
			$scope.ratingsObject.tips = [];
		}
		$scope.ratingsObject.tips.push({"description": $scope.newTip.content , "deleted": false});
		$scope.newTip.content = "";
	}

	$scope.addTop = function() {
		if(!$scope.ratingsObject.tops) {
			$scope.ratingsObject.tops = [];
		}
		$scope.ratingsObject.tops.push({"description": $scope.newTop.content, "deleted": false});
		$scope.newTop.content = "";
	}

	$scope.deleteItem = function(item) {
		item.deleted = true;	
	}

	function getAvgValue(values) {
		var sum = 0;
		var n = 0;
		for(i = 0; i < values.length; i++) {
			if(values[i] != null) {
				sum += values[i];
				n++;
			}
		}
		if(n === 0) {
			return null;
		}
		return sum / n;
	}

	function loadData(uid) {
		getObjectData('events/' + $route.current.params.eventId, 'eventObject').then(function() {
			if(!$scope.eventObject.ownerId) {
				showToast("Unknown event");
				$location.path('/dashboard');
			} else {
				if(!$scope.eventObject.ratings) {
					$scope.eventObject.ratings = {};
				}
				if(!$scope.eventObject.ratings[uid]) {
					$scope.eventObject.ratings[uid] = {};
				}
				getObjectData('events/' + $route.current.params.eventId + "/ratings/" + uid, 'ratingsObject').then(function() {
					$scope.loadedItems = true;
				});
				addParticipant(uid);
				addEvent(uid);
			}
		});
	}

	function addParticipant(uid) {
		if(!$scope.eventObject.participants) {
			$scope.eventObject.participants = [];
		}
		for(i = 0; i < $scope.eventObject.participants.length; i++) {
			if($scope.eventObject.participants[i] === uid) {
				var addParticipant = false;
			}
		}
		if(addParticipant !== false) {
			$scope.eventObject.participants.push(uid);
		}
	}

	function addEvent(uid) {
		var eventsRef = new Firebase(firebaseURL + "users/" + uid + "/events");
		$scope.events = $firebaseArray(eventsRef);
		$scope.events.$loaded(function() {
			for(i=0; i<$scope.events.length; i++) {
				if($scope.events[i].$value == $route.current.params.eventId) {
					var addEvent = false;
				}
			}
			if(addEvent !== false) {
				$scope.events.$add($route.current.params.eventId);
			}
		});
	}

	function addUserData(uid, name, imageUniformResourceLocatorSpecialThanksToBenjamin, provider) {
		getObjectData('users/' + uid, 'userObject').then(function() {
			if(provider === "password") {
				$scope.userObject.name = name.split('@')[0];
			} else if(provider === "facebook") {
				$scope.userObject.name = name;
			}
			$scope.userObject.profilePictureUrl = imageUniformResourceLocatorSpecialThanksToBenjamin;
			$scope.userObject.provider = provider;
		});
	}

	function showContinueDialog(Email) {
		$mdDialog.show({
			controller: continueDialogController,
			templateUrl: 'continueDialog.html',
			parent: angular.element(document.body),
			locals: {Email: Email}
		});

	}

	$scope.showShareDialog = function(eventId) {
		$mdDialog.show({
			controller: shareDialogController,
			templateUrl: 'shareDialog.html',
			parent: angular.element(document.body),
			locals: {eventId: eventId}
		})
	}

	function showToast(content) {
		$mdToast.show(
			$mdToast.simple()
				.content(content)
				.position('left bottom')
				.hideDelay(5000)
		);
	}

	$scope.tabs = {
		next: function() {
			$scope.selectedTabIndex = Math.min($scope.selectedTabIndex + 1, 2);
		},
		previous: function() {
			$scope.selectedTabIndex = Math.max($scope.selectedTabIndex - 1, 0);
		}
	}

	$scope.$watch('eventObject', function(newValue){
		if(newValue == null) {return;}
		var ratings = [];
		for(var key in newValue.ratings) {
			ratings.push(newValue.ratings[key].rating);
		}
		$scope.eventObject.avgRating = getAvgValue(ratings);
	});

	$scope.selectedTabIndex = 0;
	$scope.newTip = {};
	$scope.newTop = {};

});

//-----------------------------------------------------------------------------continueDialogController----------------------------------------------------
function continueDialogController($scope, $mdDialog, $mdToast, Email) {

	var authRef = new Firebase(firebaseURL);
	$scope.Email = Email;

	$scope.showSignUpDialog = function() {
		$mdDialog.show({
			controller: signUpController,
			templateUrl: 'signUpDialog.html',
			parent: angular.element(document.body)
		})
		.then(function(Email) {
			if(Email) {
				showContinueDialog(Email);
			} else {
				showContinueDialog("");
			}
		})
	}

	$scope.loginWithEmail = function(email, password) {
		authRef.authWithPassword({
			email: email,
			password: password
		}, function(error, authData) {
			if (error) {
				showToast("Something went wrong");
			} else {
				$mdDialog.hide();
			}
		});
	}

	function showToast(content) {
		$mdToast.show(
			$mdToast.simple()
				.content(content)
				.position('left bottom')
				.hideDelay(5000)
		);
	}

	$scope.loginWithFacebook = function() {
		authRef.authWithOAuthPopup("facebook", function(error, authData) {
			if(error) {
				showToast("Something went wrong");
			} else {
				$mdDialog.hide();
			}
		});
	}

	function showContinueDialog(Email) {
		$mdDialog.show({
			controller: continueDialogController,
			templateUrl: 'continueDialog.html',
			parent: angular.element(document.body),
			locals: {Email: Email}
		});
	}

}