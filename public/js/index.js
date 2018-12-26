angular.module('app', [
    'jsonFormatter',
    'ngRoute',
    'ui.router',
    'ngAnimate'
]).config(function ($stateProvider, $locationProvider, $urlRouterProvider, $compileProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/');

    let pageTitle = str => `Lunarade – ${str}`;
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|sms|tel|data):/);

    $stateProvider
        .state('login', {
            url: '/login?fpt?',
            templateUrl: '/login.html',
            controller: 'login',
            public: true,
            params: {
                sessionExpired: false,
            },
            data: { pageTitle: pageTitle('Sign in') }
        })
        .state('landing', {
            url: '/',
            public: true,
            templateUrl: '/landing.html',
            controller: 'landing',
            data: { pageTitle: pageTitle('Testing & monitoring OSS, products & services') }
        })
        .state('app', {
            url: '/app',
            abstract: true,
            templateUrl: '/app.html',
            controller: 'app'
        })
        .state('app.dashboard', {
            url: '/?fpt?',
            templateUrl: '/dashboard.html',
            params: {
            },
            controller: 'dashboard',
            data: { pageTitle: pageTitle('Dashboard') }
        })
        .state('app.store', {
            url: '/store',
            templateUrl: '/store.html',
            controller: 'store',
            data: { pageTitle: pageTitle('Store Manager') }
        })
        .state('app.vodafone', {
            url: '/vodafone',
            templateUrl: '/vodafone.html',
            controller: 'vodafone',
            data: { pageTitle: pageTitle('Vodafone Debugger') }
        })
        .state('app.iam', {
            url: '/iam',
            templateUrl: '/iam.html',
            controller: 'iam',
            data: { pageTitle: pageTitle('IAM') }
        })
        .state('app.monitors', {
            url: '/monitors',
            templateUrl: '/monitors.html',
            controller: 'monitors',
            data: { pageTitle: pageTitle('Monitors') }
        })
        .state('app.deployments', {
            url: '/deployments',
            templateUrl: '/deployments.html',
            controller: 'deployments',
            data: { pageTitle: pageTitle('Deployment History') }
        })
        .state('app.carddav', {
            url: '/carddav',
            templateUrl: '/carddav.html',
            controller: 'carddav',
            data: { pageTitle: pageTitle('CardDAV Debugger') }
        })
        .state('app.emails', {
            url: '/emails',
            templateUrl: '/emails.html',
            controller: 'emails',
            data: { pageTitle: pageTitle('Email History') }
        })
        .state('app.logBrowser', {
            url: '/logBrowser',
            templateUrl: '/logBrowser.html',
            controller: 'logBrowser',
            data: { pageTitle: pageTitle('Log Browser') }
        })
        .state('app.emails.view', {
            url: '/:emailId',
            abstract: true,
            templateUrl: '/email-view.html',
            controller: 'emailView'
        })
        .state('app.emails.view.tab', {
            url: '/:tab',
            templateUrl: '/email-view-tab.html',
            controller: 'emailViewTab',
            data: { pageTitle: pageTitle('Email details') }
        })
        .state('app.companies', {
            url: '/companies?masterKey&env&url',
            reloadOnSearch: false,
            templateUrl: '/companyBrowser.html',
            controller: 'companyBrowser',
            data: { pageTitle: pageTitle('Company Manager') }
        })
        .state('app.companies.view', {
            url: '/:id?cmasterKey&cenv&curl',
            abstract: true,
            reloadOnSearch: false,
            templateUrl: '/companyBrowserView.html',
            controller: 'companyBrowserView'
        })
        .state('app.companies.view.info', {
            url: '/info',
            reloadOnSearch: false,
            templateUrl: '/companyBrowserViewInfo.html',
            controller: 'companyBrowserViewInfo'
        })
        .state('app.companies.view.subscriptions', {
            url: '/subscriptions',
            reloadOnSearch: false,
            templateUrl: '/companyBrowserViewSubscriptions.html',
            controller: 'companyBrowserViewSubscriptions'
        })
        .state('app.companies.view.users', {
            url: '/users',
            reloadOnSearch: false,
            templateUrl: '/users.html',
            controller: 'users'
        })
        .state('app.companies.view.payments', {
            url: '/payments',
            reloadOnSearch: false,
            templateUrl: '/companyBrowserViewPayments.html',
            controller: 'companyBrowserViewPayments'
        })
        .state('app.companies.view.logBrowser', {
            url: '/logBrowser',
            templateUrl: '/logBrowser.html',
            controller: 'logBrowser',
            data: { pageTitle: pageTitle('Log Browser') }
        })
        .state('app.companies.view.emails', {
            url: '/emails',
            templateUrl: '/emails.html',
            controller: 'emails',
            data: { pageTitle: pageTitle('Email history') }
        })
        .state('app.companies.view.emails.view', {
            url: '/:emailId',
            abstract: true,
            templateUrl: '/email-view.html',
            controller: 'emailView'
        })
        .state('app.companies.view.emails.view.tab', {
            url: '/:tab',
            templateUrl: '/email-view-tab.html',
            controller: 'emailViewTab',
            data: { pageTitle: pageTitle('Email details') }
        })
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