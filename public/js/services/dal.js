angular.module('app').service('dal', class Dal {
    constructor($rootScope, $http, $state) {
        this.$rootScope = $rootScope;
        this.$http = $http;
        this.$state = $state;
        this.user = null;
        this.initialized = false;

        this.auth = {};

        this.auth.promise = new Promise(resolver => this.auth.authPromiseResolver = resolver);

        let lsUser = localStorage.getItem('user');

        try {
            lsUser = JSON.parse(lsUser);
        } catch (e) { }

        if (!lsUser) {
            this.auth.authPromiseResolver(false);
            this.initialized = true;
        }
        else
            (async () => {
                try {
                    this.setUser((await this.get(`/api/v1/me`)).data);
                } catch (e) {
                    console.error(e);
                    this.auth.authPromiseResolver(false);
                    localStorage.removeItem('user');
                } finally {
                    this.initialized = true;
                }
            })();
    }

    isAuthorized() {
        return !!this.user;
    }

    logout() {
        this.get('/api/v1/logout');
        this.clearUserData();
        this.$rootScope.$broadcast('logout');
        this.$state.transitionTo('login');
    }

    clearUserData() {
        this.user = null;
        localStorage.removeItem('user');
    }

    setUser(user) {
        if (!user || !user._id)
            return;

        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        this.auth.authPromiseResolver(true);
    }

    get headers() {
        return {
            'x-app-csrf': window.__csrf,
            'x-client-version': `PAP/${window.__version.replace('v', '')}`
        };
    }

    get(url, options) {
        return this._request.call(this, Object.assign({
            url,
            headers: this.headers,
            method: 'get'
        }, options || {}));
    }

    post(url, options) {
        return this._request.call(this, Object.assign({
            url,
            headers: this.headers,
            method: 'post'
        }, options || {}));
    }

    delete(url, options) {
        return this._request.call(this, Object.assign({
            url,
            headers: this.headers,
            method: 'delete'
        }, options || {}));
    }

    _request() {
        return this.$http.call(null, ...arguments).catch(error => {
            if (error.status == 401 && this.$state.current.name != 'login' && this.user) {
                $('.modal-backdrop').remove();
                this.clearUserData();
                this.$state.transitionTo('login', { sessionExpired: true });
            }
            throw error;
        });
    }
});