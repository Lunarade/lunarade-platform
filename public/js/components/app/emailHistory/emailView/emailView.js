angular.module('app').controller('emailView', function ($uiRouter, $scope, $timeout, $sce, dal, $stateParams, $state, $location) {
    $scope.displayEmailSubject = 'Subject: ...';
    $scope.displayEmailBodyHtml = null;
    $scope.displayEmailBodyText = null;
    $scope.lastEmailHistoryInfo = null;
    $scope.id = $stateParams.emailId;

    this.$stateParams = $stateParams;

    (async () => {
        let emailContents = (await dal.get(`/api/v1/emails/content/${$stateParams.emailId}`)).data;

        $scope.lastEmailHistoryInfo = emailContents._info;
        $scope.displayEmailSubject = 'Subject: ' + emailContents._info.subject;

        $scope.emailContents = emailContents;

        if (!emailContents.error) {
            $scope.displayEmailBodyHtml = $sce.trustAsHtml(emailContents.html);
            $scope.displayEmailBodyText = $sce.trustAsHtml(emailContents.text);
        } else {
            $scope.displayEmailBodyHtml = $sce.trustAsHtml(emailContents.message);
            $scope.displayEmailBodyText = $sce.trustAsHtml(emailContents.message);
        }

        $scope.$apply();
    })();

    $scope.openAttachment = attachment => {
        var byteCharacters = atob(attachment.content);
        var byteNumbers = new Array(byteCharacters.length);

        for (var i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);
        let blob = new Blob([byteArray], {
            type: attachment.type
        });

        window.open(URL.createObjectURL(blob));
    };

    $timeout(() => {
        $('#viewEmailModal').modal();
        $('#viewEmailModal').on('hidden.bs.modal', function (e) {
            $state.go($scope.$parent.settings.baseState);
        })
    });

    $scope.$on('$destroy', () => {
        $('#viewEmailModal').modal({ show: false });
        $('.modal-backdrop').remove();
    });
})

angular.module('app').controller('emailViewTab', function ($scope, $stateParams, $timeout) {
    $scope.$stateParams = $stateParams;
    $timeout(() => {
        $(`[data-target="#${$stateParams.tab}"]`).removeClass('active').tab('show');
    });
});