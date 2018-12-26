angular.module('app').controller('login', function ($rootScope, $scope, $state, dal, $timeout, $location) {
    $rootScope.main.showLoader = false;
    $scope.fpt = $location.search() && $location.search().fpt;
    $scope.page = $scope.fpt ? 'resetPassword' : 'login';

    $timeout(() => {
        $('.email').focus();
    });

    if ($state.params.sessionExpired)
        $timeout(() => {
            $('#sessionExpiredModal').modal('show');
        });

    $scope.submit = async () => {
        $scope.erroMessage = false;
        $rootScope.main.showLoader = true;
        try {
            if ($scope.page == 'login') {
                let response = (await dal.post('/api/v1/login', {
                    data: {
                        email: $scope.email,
                        password: $scope.password
                    }
                })).data;

                window.__csrf = response.csrfToken;
                $rootScope.user = response;

                $scope.user = response;
                dal.setUser($scope.user);

                if ($rootScope.wantedState) {
                    $state.go($rootScope.wantedState.name, $rootScope.wantedState.params);
                    $rootScope.wantedState = null;
                }
                else
                    $state.go('app.dashboard');

                !$scope.$$phase && $scope.$apply();
            }
            if ($scope.page == 'forgotPassword') {
                let response = (await dal.post('/api/v1/password/forgot', {
                    data: { email: $scope.email }
                })).data;

                $scope.page = 'forgotPasswordSuccess';
                !$scope.$$phase && $scope.$apply();
            }
            if ($scope.page == 'resetPassword') {
                let response = (await dal.post('/api/v1/password/reset', {
                    data: { token: $scope.fpt, password: $scope.password }
                })).data;

                $scope.page = 'resetPasswordSuccess';
                !$scope.$$phase && $scope.$apply();
            }
        } catch (e) {
            $scope.erroMessage = true;
            if ($scope.page == 'login')
                $scope.error = "These credentials didn't work.";
            if ($scope.page == 'forgotPassword')
                $scope.error = "Reset request failed. Make sure you entered a correct email and that you don't have an unused reset link from the last 24 hours.";
            if ($scope.page == 'resetPassword')
                $scope.error = "Reset request failed.";
        } finally {
            $timeout(() => {
                $rootScope.main.showLoader = false;
            }, 1e3);
            !$scope.$$phase && $scope.$apply();
        }
    }
});