window.pageTitle = str => `Lunarade – ${str}`;
window._states = {
    ['login']: {
        url: '?fpt?',
        templateUrl: '/login.html',
        controller: 'login',
        public: true,
        params: {
            sessionExpired: false,
        },
        data: { pageTitle: pageTitle('Sign in') }
    },
    ['app']: {
        url: '',
        abstract: true,
        templateUrl: '/app.html',
        controller: 'app'
    },
    ['app.iam']: {
        url: '/iam',
        templateUrl: '/iam.html',
        controller: 'iam',
        data: { pageTitle: pageTitle('IAM') }
    },
    ['app.monitors']: {
        url: '/monitors',
        templateUrl: '/monitors.html',
        controller: 'monitors',
        data: { pageTitle: pageTitle('Monitors') }
    }
}

angular.module('app', [
    'jsonFormatter',
    'ngRoute',
    'ui.router',
    'ngAnimate'
]).config(function ($stateProvider, $locationProvider, $urlRouterProvider, $compileProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/');

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|sms|tel|data):/);

    for (let state in _states)
        $stateProvider.state(state, _states[state]);
}).run(function ($rootScope, $transitions, dal, constants) {
    $rootScope.$watch(() => {
        $('.selectpicker').selectpicker('render');
        $('.selectpicker').selectpicker('refresh');
    });

    $transitions.onBefore({}, transition => {
        let to = transition.to();
        let from = transition.from();

        console.log(`[${from.name}] -> [${to.name}]`);
        window.Intercom("update");

        if (to.public) {
            return true;
        }
        else
            if (dal.initialized && !dal.isAuthorized()) {
                return saveWantedStateAndReturnRedirectToLogin(to, from, transition);
            }
            else {
                if (!dal.initialized)
                    return dal.auth.promise.then(result => {
                        if (!result)
                            return saveWantedStateAndReturnRedirectToLogin(to, from, transition);
                        else
                            return true;
                    });
            }
    });

    function saveWantedStateAndReturnRedirectToLogin(stateObject, from, transition) {
        if (from.name != 'login') {
            stateObject.params = transition.params();
            $rootScope.wantedState = stateObject;
        }

        return transition.router.stateService.target('login', { fpt: stateObject.params && stateObject.params.fpt });
    }
}).constant('constants', {
    httpMethods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'COPY',
        'HEAD',
        'OPTIONS',
        'LINK',
        'UNLINK',
        'PURGE',
        'LOCK',
        'UNLOCK',
        'PROPFIND',
        'VIEW'
    ]
});