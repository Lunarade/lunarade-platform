angular.module('app').controller('topbar', function ($scope, dal) {
    $scope.user = () => dal.user;
    $scope.showNewVersion = false;
    $scope.location = location.href;
    $scope.logout = () => {
        dal.logout();
    }

    $(window).click(function (event) {
        if (!$(event.target).is('.submenu *,.submenu,.user-image') && $scope.showSubMenu == true) {
            $scope.showSubMenu = false;
            $scope.$apply();
        }
    });

    setInterval(async () => {
        let latestVersion = 'v' + await $.get('/api/v1/version');
        let clientVersion = $('.version').html();

        if (clientVersion != latestVersion) {
            $scope.showNewVersion = true;
            !$scope.$$phase && $scope.$apply();
        }
    }, 120e3);
});