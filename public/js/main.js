angular.module('app').controller('main', function (constants, $state, $scope, $rootScope, dal, prettyDateTime) {
    this.showLoader = true;
    $rootScope.main = this;
    $scope.$rootScope = $rootScope;
    $scope.$state = $state;
    $scope.prettyDateTime = prettyDateTime;
    $scope.isChristmas = new Date().getMonth() == 11;
    $scope.constants = constants;

    try {
        window.Intercom("boot", {
            app_id: "ic2a3a0a"
        });
    } catch (e) { }

    $scope.openDataUrlFileToNewTab = (dataUrl, type) => {
        var byteCharacters = atob(dataUrl);
        var byteNumbers = new Array(byteCharacters.length);

        for (var i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);
        var file = new Blob([byteArray], { type });
        var fileURL = URL.createObjectURL(file);
        window.open(fileURL);
    }

    $scope.numberToUnit = n => {
        if (n > 1e3 && n < 1e6)
            return parseInt(n / 1e3) + 'k';
        if (n > 1e6 && n < 1e9)
            return parseInt(n / 1e3) + 'm';
        if (n > 1e9)
            return parseInt(n / 1e3) + 'bn';
        return n;
    }

    (async () => {
        await dal.auth.promise;
    })();
});