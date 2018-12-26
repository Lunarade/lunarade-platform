angular.module('app').controller('iam', function ($scope, dal, $timeout, $rootScope, prettyDateTime) {
    $scope.showSpinner = true;
    $scope.tables = [];
    $scope.data = {
        roles: [],
        permissions: [],
        users: []
    };

    $scope.activitiesUser = null;

    $scope.permissions = [
        { name: 'Dashboard.Read.All', title: 'View the dashboard' },
        { name: 'IAM.ReadWrite.All', title: 'View and manage users, roles and permissions' }
    ];

    $scope.loadUserActivities = async user => {
        $scope.selectedRequest = null;
        $scope.searchingRequests = true;
        $scope.activitiesUser = user;
        $scope.requests = [];
        !$scope.$$phase && $scope.$apply();
        setTimeout(() => {
            $('.activity-search').focus();
        }, 1e3);
        $scope.requests = (await dal.get(`/api/v1/iam/user/${user._id}/history?term=${encodeURIComponent($scope.requestTerm || '')}`)).data.map(r => { r.timeAgo = $scope.timeAgo(r.timestamp); return r; });
        $scope.searchingRequests = false;
        !$scope.$$phase && $scope.$apply();
    }

    $scope.timeAgo = ts => {
        let ms = Date.now() - new Date(isNaN(ts) ? ts : +ts).getTime();
        if (ms < 5 * 60e3)
            return 'Just now';
        else if (!ms)
            return 'Never';
        else
            return prettyDateTime(ms, 2) + ' ago';
    };

    $scope.datetime = unixts => new Date(+unixts).toUTCString();

    async function drawUserTable() {
        return new Promise(r => setTimeout(async () => {
            $scope.tables = [0];
            !$scope.$$phase && $scope.$apply();
            await new Promise(r => setTimeout(r, 1));
            $scope.tables = [1];
            !$scope.$$phase && $scope.$apply();
            $scope.data.users.length &&
                $('#userTable').Tabledit({
                    url: '/api/v1/iam/users',
                    columns: {
                        identifier: [0, 'ID'],
                        editable: [
                            [1, 'imageUrl'],
                            [2, 'firstName'],
                            [3, 'lastName'],
                            [4, 'email'],
                            [5, 'role', JSON.stringify($scope.data.roles.map(r => r.name).reduce((o, v, i, a) => { o[v] = v; return o; }, {}))],
                            [10, 'status', '{"Active": "Active", "Banned": "Banned"}']
                        ]
                    },
                    editButton: false,
                    buttons: {
                        edit: {
                            class: 'btn btn-sm btn-primary',
                            html: '<i class="fas fa-pencil-alt"></i>&nbsp; EDIT',
                            action: 'edit'
                        },
                        delete: {
                            class: 'btn btn-sm btn-danger',
                            html: '<i class="fas fa-trash-alt"></i>&nbsp; DELETE',
                            action: 'delete'
                        }
                    },
                    onDraw: function () {
                    },
                    onSuccess: function (data, textStatus, jqXHR) {
                    },
                    onFail: function (jqXHR, textStatus, errorThrown) {
                    },
                    onAlways: function () {
                    },
                    onAjax: function (action, serialize) {
                        if (action == 'edit' && !serialize.match(/ID=/))
                            return false;

                        if (action == 'edit' && serialize.split('&').length > 3)
                            return false;

                        let hasID = !serialize.match(/ID=&/);
                        if (!hasID && $scope.data.users.filter(u => !u._id).length) {
                            $.ajax({
                                headers: { 'x-app-csrf': window.__csrf },
                                url: '/api/v1/iam/users',
                                method: 'post',
                                data: serialize,
                                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                                async: false
                            }).done(data => {
                                (async () => {
                                    Object.assign($scope.data.users.filter(u => !u._id)[0] || {}, data || {});
                                    drawUserTable();
                                    if (action == 'edit' && ~serialize.indexOf($rootScope.user._id)) {
                                        $rootScope.user = (await dal.get('/api/v1/me')).data;
                                        !$scope.$$phase && $scope.$apply();
                                    }
                                })();
                            });
                            return false;
                        }

                        if (action == 'edit' && !hasID && !$scope.data.users.filter(u => !u._id).length)
                            return false;

                        let id = serialize.match(/ID=([^&]+)/)[1];
                        if (action == 'delete') {
                            $scope.data.users.splice($scope.data.users.indexOf($scope.data.users.filter(u => u._id == id)[0]), 1);
                            drawUserTable();
                        }

                        $.ajax({
                            headers: { 'x-app-csrf': window.__csrf },
                            url: '/api/v1/iam/users',
                            method: 'post',
                            data: serialize,
                            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                        }).done(data => {
                            (async () => {
                                Object.assign($scope.data.users.filter(u => u._id == id)[0] || {}, data || {});
                                if (action == 'edit' && serialize.match(/role=/)) {
                                    $scope.refreshTables();
                                }
                                if (action == 'edit' && ~serialize.indexOf($rootScope.user._id)) {
                                    $rootScope.user = (await dal.get('/api/v1/me')).data;
                                    !$scope.$$phase && $scope.$apply();
                                }
                            })();
                        });
                    }
                });
            r();
        }));
    }

    $scope.refreshTables = async () => {
        $scope.showSpinner = true;
        $scope.tables = [0];
        !$scope.$$phase && $scope.$apply();
        await getAllData();
        $scope.tables = [1];
        !$scope.$$phase && $scope.$apply();
        await Promise.all([
            drawPermissionTable(),
            drawUserTable(),
            drawRoleTable()
        ]);
        $scope.showSpinner = false;
        !$scope.$$phase && $scope.$apply();
    }
    async function drawRoleTable() {
        return new Promise(r => setTimeout(async () => {
            $scope.tables = [0];
            !$scope.$$phase && $scope.$apply();
            await new Promise(r => setTimeout(r, 1));
            $scope.tables = [1];
            !$scope.$$phase && $scope.$apply();
            $scope.data.roles.length &&
                $('#roleTable').Tabledit({
                    url: '/api/v1/iam/roles',
                    columns: {
                        identifier: [0, 'ID'],
                        editable: [
                            [1, 'name'],
                            [2, 'description'],
                        ]
                    },
                    editButton: false,
                    buttons: {
                        edit: {
                            class: 'btn btn-sm btn-primary',
                            html: '<i class="fas fa-pencil-alt"></i>&nbsp; EDIT',
                            action: 'edit'
                        },
                        delete: {
                            class: 'btn btn-sm btn-danger',
                            html: '<i class="fas fa-trash-alt"></i>&nbsp; DELETE',
                            action: 'delete'
                        }
                    },
                    onDraw: function () {
                    },
                    onSuccess: function (data, textStatus, jqXHR) {
                    },
                    onFail: function (jqXHR, textStatus, errorThrown) {
                    },
                    onAlways: function () {
                    },
                    onAjax: function (action, serialize) {
                        if (action == 'edit' && !serialize.match(/ID=/))
                            return false;

                        if (action == 'edit' && serialize.split('&').length > 3)
                            return false;

                        let hasID = !serialize.match(/ID=&/);
                        if (!hasID && $scope.data.roles.filter(u => !u._id).length) {
                            $.ajax({
                                headers: { 'x-app-csrf': window.__csrf },
                                url: '/api/v1/iam/roles',
                                method: 'post',
                                data: serialize,
                                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                                async: false
                            }).done(data => {
                                Object.assign($scope.data.roles.filter(u => !u._id)[0] || {}, data || {});
                                drawRoleTable();
                            });
                            return false;
                        }

                        if (action == 'edit' && !hasID && !$scope.data.roles.filter(u => !u._id).length)
                            return false;

                        let id = serialize.match(/ID=([^&]+)/)[1];
                        if (action == 'delete') {
                            $scope.data.roles.splice($scope.data.roles.indexOf($scope.data.roles.filter(u => u._id == id)[0]), 1);
                            drawRoleTable();
                        }

                        $.ajax({
                            headers: { 'x-app-csrf': window.__csrf },
                            url: '/api/v1/iam/roles',
                            method: 'post',
                            data: serialize,
                            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                        }).done(data => {
                            Object.assign($scope.data.roles.filter(u => u._id == id)[0] || {}, data || {});
                        });
                    }
                });
            r();
        }));
    }
    async function drawPermissionTable() {
        return new Promise(r => setTimeout(async () => {
            $scope.tables = [0];
            !$scope.$$phase && $scope.$apply();
            await new Promise(r => setTimeout(r, 1));
            $scope.tables = [1];
            !$scope.$$phase && $scope.$apply();
            $scope.data.permissions.length &&
                $('#permissionTable').Tabledit({
                    url: '/api/v1/iam/permissions',
                    columns: {
                        identifier: [0, 'ID'],
                        editable: [
                            [1, 'name'],
                            [2, 'title'],
                        ]
                    },
                    editButton: false,
                    buttons: {
                        edit: {
                            class: 'btn btn-sm btn-primary',
                            html: '<i class="fas fa-pencil-alt"></i>&nbsp; EDIT',
                            action: 'edit'
                        },
                        delete: {
                            class: 'btn btn-sm btn-danger',
                            html: '<i class="fas fa-trash-alt"></i>&nbsp; DELETE',
                            action: 'delete'
                        }
                    },
                    onDraw: function () {
                    },
                    onSuccess: function (data, textStatus, jqXHR) {
                    },
                    onFail: function (jqXHR, textStatus, errorThrown) {
                    },
                    onAlways: function () {
                    },
                    onAjax: function (action, serialize) {
                        if (action == 'edit' && !serialize.match(/ID=/))
                            return false;

                        if (action == 'edit' && serialize.split('&').length > 3)
                            return false;

                        let hasID = !serialize.match(/ID=&/);
                        if (!hasID && $scope.data.permissions.filter(u => !u._id).length) {
                            $.ajax({
                                headers: { 'x-app-csrf': window.__csrf },
                                url: '/api/v1/iam/permissions',
                                method: 'post',
                                data: serialize,
                                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                                async: false
                            }).done(data => {
                                Object.assign($scope.data.permissions.filter(u => !u._id)[0] || {}, data || {});
                                drawPermissionTable();
                            });
                            return false;
                        }

                        if (action == 'edit' && !hasID && !$scope.data.permissions.filter(u => !u._id).length)
                            return false;

                        let id = serialize.match(/ID=([^&]+)/)[1];
                        if (action == 'delete') {
                            $scope.data.permissions.splice($scope.data.permissions.indexOf($scope.data.permissions.filter(u => u._id == id)[0]), 1);
                            drawPermissionTable();
                        }

                        $.ajax({
                            headers: { 'x-app-csrf': window.__csrf },
                            url: '/api/v1/iam/permissions',
                            method: 'post',
                            data: serialize,
                            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                        }).done(data => {
                            Object.assign($scope.data.permissions.filter(u => u._id == id)[0] || {}, data || {});
                        });
                    }
                });
            r();
        }));
    }

    $scope.addUser = () => {
        $scope.data.users = [{ firstName: '' }].concat($scope.data.users);
        setTimeout(() => drawUserTable().then(() => $('#userTable .af span').click()));
    };

    $scope.addPermission = () => {
        $scope.data.permissions = [{ name: '' }].concat($scope.data.permissions);
        setTimeout(() => drawPermissionTable().then(() => $('#permissionTable .af span').click()));
    };

    $scope.addRole = () => {
        $scope.data.roles = [{ name: '' }].concat($scope.data.roles);
        setTimeout(() => drawRoleTable().then(() => $('#roleTable .af span').click()));
    };

    $scope.updateUserPermissions = async user => {
        dal.post('/api/v1/iam/users', {
            data: { ID: user._id, permissions: user.permissions }
        });

        if (user._id == $rootScope.user._id) {
            $rootScope.user = (await dal.get('/api/v1/me')).data;
            !$scope.$$phase && $scope.$apply();
        }
    };

    $scope.updateRolePermissions = role => {
        dal.post('/api/v1/iam/roles', {
            data: { ID: role._id, permissions: role.permissions }
        });
    };

    async function getAllData() {
        $scope.data = (await dal.get('/api/v1/iam/all')).data;
        $scope.data.users.forEach(u => u.timeAgo = $scope.timeAgo(u.lastSeen));
    }

    (async () => {
        await getAllData();
        drawUserTable();
        $scope.showSpinner = false;
        !$scope.$$phase && $scope.$apply();
    })();
});