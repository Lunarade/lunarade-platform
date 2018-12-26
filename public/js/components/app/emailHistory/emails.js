angular.module('app').controller('emails', function ($scope, $timeout, prettyDateTime, dal, $state) {
    $scope.emailHistoryLimit = 25;
    $scope.initialized = false;
    $scope.tsToDate = ts => new Date(ts * 1e3).toJSON();
    let lastAction = Date.now();

    $scope.settings = ($scope.$parent && $scope.$parent.emailHistorySettings ? $scope.$parent.emailHistorySettings : null) || {
        showHeader: true,
        baseState: 'app.emails',
        query: ''
    }

    var loopTimeout;
    var loopRequestCanceler;

    $(`[data-target="#companyBrowser_emails"]`).siblings('.active').removeClass('active');
    $(`[data-target="#companyBrowser_emails"]`).removeClass('active').tab('show');

    $timeout(() => {
        $('.emails-search-term').focus();
    });

    $scope.assertEmailLimitGtOne = () => {
        if (isNaN($scope.emailHistoryLimit) || $scope.emailHistoryLimit < 1)
            $scope.emailHistoryLimit = 1;
    }

    let lastRequest;

    $scope.loop = async function loop() {
        let requestTime = lastRequest = Date.now();
        if ($scope.isDead)
            return;
        if (loopTimeout) {
            $timeout.cancel(loopTimeout);
            loopTimeout = null;
        }

        loopRequestCanceler && loopRequestCanceler();

        let query = $scope.settings.query;

        $timeout(() => {
            $scope.fetching = true;
        }, 50);

        try {
            $scope.emails = (await dal.get(`/api/v1/emails/history/${$scope.emailHistoryLimit}?query=${encodeURIComponent($scope.settings.query || '')}`, {
                timeout: new Promise(r => loopRequestCanceler = r)
            })).data;
            if ($scope.emails.statusCode)
                return;
            if (query != $scope.settings.query)
                return;
            $scope.emails.forEach(e => {
                e.env = (e.tags.filter(t => /^env_/.test(t))[0] || '-').split('_').pop().trim() || '-';
                e.db = (e.tags.filter(t => /^db_/.test(t))[0] || '-').split('_').pop().trim() || '-';
                e.company = (e.tags.filter(t => /^cid_/.test(t))[0] || '').split('_').pop().trim() || '';
                e.timeAgo = prettyDateTime(Date.now() - (e.ts * 1e3), 2)
            });
            $scope.initialized = true;
        } finally {
            if (requestTime != lastRequest)
                return;
            $scope.fetching = false;
            if (!loopTimeout) {
                if (Date.now() > lastAction + 5 * 60e3)
                    $scope.showInactiveMessage = true;
                else
                    loopTimeout = $timeout($scope.loop, 5e3);
            }
            !$scope.$$phase && $scope.$apply();
        }
    }

    $scope.loop();

    function wake() {
        if ($scope.showInactiveMessage) {
            $scope.showInactiveMessage = false;
            $scope.loop();
            !$scope.$$phase && $scope.$apply();
        }
        lastAction = Date.now();
    }

    window.addEventListener('focus', wake);
    window.addEventListener('mousemove', wake);

    $scope.$on('$destroy', () => {
        $scope.isDead = true;
        window.removeEventListener('focus', wake);
        window.removeEventListener('mousemove', wake);
    });
});