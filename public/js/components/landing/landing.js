angular.module('app').controller('landing', function ($rootScope, $scope, $state, dal, $timeout, $location) {
    $rootScope.main.showLoader = false;
    $.getScript("https://buttons.github.io/buttons.js");
});