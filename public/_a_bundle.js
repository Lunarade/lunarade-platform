Object.assign(_states, {
    ['login']: {
        url: '/login?fpt?',
        templateUrl: '/login.html',
        controller: 'login',
        public: true,
        params: {
            sessionExpired: false,
        },
        data: { pageTitle: pageTitle('Sign in') }
    },
    ['app']: {
        url: '/app',
        abstract: true,
        templateUrl: '/app.html',
        controller: 'app'
    },
    ['landing']: {
        url: '/',
        public: true,
        templateUrl: '/landing.html',
        controller: 'landing',
        data: { pageTitle: pageTitle('Testing & monitoring OSS, products & services') }
    }
});

angular.module('app')
    .controller('landing', function ($rootScope, $scope, $state, dal, $timeout, $location) {
        $rootScope.main.showLoader = false;
        $.getScript("https://buttons.github.io/buttons.js");
    });