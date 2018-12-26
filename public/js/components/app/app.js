angular.module('app').controller('app', function ($scope, $rootScope, dal) {
    (async () => {
        $rootScope.user = (await dal.get('/api/v1/me')).data;

        $rootScope.main.showLoader = false;
        $scope.$apply();
    })();

    $scope.permission = name => {
        try {
            return !!~$rootScope.user.permissions.indexOf(name);
        } catch (e) {
            return false;
        }
    };
});