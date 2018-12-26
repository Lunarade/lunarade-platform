import { Lunarade } from '@lunarade/core';
import * as express from 'express';
import * as pug from 'pug';
import * as sass from 'node-sass';
import * as fs from 'fs';
import * as request from 'request-promise-native';
import { ObjectID, Db, MongoClient } from 'mongodb';
import { createHmac, randomBytes } from 'crypto';
import { exec } from 'child_process';
import getPort = require('get-port');

const tunnel = require('tunnel-ssh');
const compression = require('compression');
let dbc: Db;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export default class Application {
    public isProduction = process.env.PRODUCTION == '1';
    public configuration: Lunarade.Configuration;
    public packageFile: { version: string; } = require('../../package');
    public app = express();
    public get db(): Db { return dbc; }
    public initialized: Promise<Boolean>;
    public initialize: any;
    public mandrillApiKey: string;
    public signingKey: string;
    public createCsrf(token) {
        return createHmac('sha256', this.signingKey).update(token).digest('base64');
    }
    public get logAction() {
        let that = this;
        return (req, res, next) => {
            that.db.collection('actions').insertOne(req.requestInfo);
            next();
        }
    }
    public permissions(permissions) {
        return (req, res, next) => {
            for (let permission of permissions)
                if (~req.user.permissions.indexOf(permission))
                    return next();
            res.statusCode(403);
            return res.send('Forbidden.');
        };
    }
    constructor() {
        console.log(`Lunarade Platform v${this.packageFile.version}`);

        const configFileName = `${process.env.USERPROFILE || process.env.HOME}/.lunarade-cli`;
        this.configuration = JSON.parse(fs.readFileSync(configFileName).toString());
        this.loadModules();

        const bodyparser = require('body-parser');
        const cookieparser = require('cookie-parser');
        const indexFile = fs.readFileSync('../_index.pug');
        const precompiledIndexFile = pug.compile(indexFile.toString(), { basedir: '..' });

        this.initialized = new Promise(r => this.initialize = r);

        const compiledIndexFile = () => {
            if (!this.isProduction)
                return pug.compile(fs.readFileSync('../_index.pug').toString(), { basedir: '..' });
            else
                return precompiledIndexFile;
        };

        this.connectDb();

        this.app.listen(this.configuration.port, this.configuration.host);

        this.app.post('/api/upgrade', async (req, res, next) => {
            let data = '';
            req.on('data', (c: Buffer) => data += c.toString());
            req.on('end', async () => {
                res.end('ok');
                let xHubHeader = req.headers['x-hub-signature'] as string;

                if (!xHubHeader)
                    return;

                let signature = xHubHeader.split('=')[1];
                let algorithm = xHubHeader.split('=')[0];

                if (signature === createHmac(algorithm, this.signingKey).update(data).digest('hex')) {
                    console.log('Signature is valid.');
                    let branch = JSON.parse(data).ref.split('/').pop();
                    console.log(`Target branch: ${branch}`);

                    if (branch != 'master')
                        return;

                    await new Promise(r => exec('lunarade u', r));
                    await new Promise(r => exec('forever restartall', r));

                    console.log('Done.');
                }
            });
        });

        this.app.use(compression());
        this.app.use(cookieparser());
        this.app.use(bodyparser.text());
        this.app.use(bodyparser.json());
        this.app.use(bodyparser.urlencoded({ extended: true }));

        this.app.all(['/', /^[^\.]*$/], async (req, res, next) => {
            try {
                await this.initialized;
                if (req.cookies['x-app-session']) {
                    let { user } = await this.db.collection('tokens').findOne({ token: req.cookies['x-app-session'] });

                    let dbUser = await dbc.collection('users').findOne({ _id: new ObjectID(user), status: 'Active' });
                    req['user'] = dbUser;
                    req['hasCsrf'] = this.createCsrf(req.cookies['x-app-session']) == req.headers['x-app-csrf'];
                }
            } catch (e) { }

            next();
        });;

        this.app.all(['/', /^[^\.]*$/], async (req, res, next) => {
            if (/^\/api\//.test(req.url))
                return next();

            if (req['user']) {
                dbc.collection('users').updateOne({ _id: new ObjectID(req['user']._id) }, { $inc: { pageloads: 1 }, $set: { lastSeen: Date.now() } });
                this.logUserActivity(req, null, res);
            }

            res.setHeader('Content-Type', 'text/html');

            res.end(compiledIndexFile()({
                version: 'v' + this.packageFile.version,
                csrfToken: req['user'] && this.createCsrf(req.cookies['x-app-session'])
            }));
        });

        this.app.get('/api/v1/version', async (req, res, next) => {
            res.end(this.packageFile.version);
        });

        function incrementUserApiCalls(userId) {
            dbc.collection('users').updateOne({ _id: new ObjectID(userId) }, { $inc: { apiCalls: 1 }, $set: { lastSeen: Date.now() } });
        }

        this.app.post('/api/v1/password/forgot', async (req, res) => {
            let SERVICE_ENDPOINT = 'https://example.com';
            let user = await this.db.collection('users').findOne({ email: req.body.email });

            if (!user) {
                return res.sendStatus(404);
            }

            let fpt = await this.db.collection('forgotPasswordTokens').findOne({ user: new ObjectID(user._id) });

            if (fpt) {
                return res.sendStatus(403);
            }

            let token = randomBytes(50).toString('base64');
            this.db.collection('forgotPasswordTokens').insertOne({
                token,
                user: new ObjectID(user._id),
                expireAt: new Date(Date.now() + 24 * 60 * 60e3),
                timestamp: new Date()
            });

            await request.post('https://mandrillapp.com/api/1.0/messages/send.json', {
                json: true,
                body: {
                    key: this.mandrillApiKey,
                    tags: ['admin-panel'],
                    message: {
                        html: `<a href="${SERVICE_ENDPOINT}/?fpt=${encodeURIComponent(token)}">${SERVICE_ENDPOINT}/?fpt=${encodeURIComponent(token)}</a>`,
                        text: `${SERVICE_ENDPOINT}/?fpt=${encodeURIComponent(token)}`,
                        subject: 'Password reset link',
                        from_email: "noreply@lunarade.com",
                        from_name: "Lunarade Support",
                        to: [
                            {
                                email: user.email,
                                name: [user.firstName || '', user.lastName || ''].join(' ').trim(),
                                type: "to"
                            }
                        ]
                    },
                    async: false
                }
            });

            res.send('ok');
        });

        this.app.post('/api/v1/password/reset', async (req, res) => {
            let fpt = await this.db.collection('forgotPasswordTokens').findOne({ token: req.body.token });

            if (!fpt) {
                console.log('token not found');
                return res.sendStatus(404);
            }

            let user = await this.db.collection('users').findOne({ _id: new ObjectID(fpt.user), status: 'Active' });

            if (!user) {
                return res.sendStatus(404);
            }

            this.db.collection('forgotPasswordTokens').remove({ _id: new ObjectID(fpt._id) });

            let salt = randomBytes(100).toString('base64');
            this.db.collection('users').updateOne({ _id: new ObjectID(fpt.user) }, {
                $set: {
                    salt,
                    password: createHmac('sha256', this.signingKey).update(req.body.password + salt).digest('base64')
                }
            });

            res.send('ok');
        });

        this.app.post('/api/v1/login', async (req, res) => {
            let user, token;
            try {
                user = await application.db.collection('users').findOne({
                    email: req.body.email.toString()
                });

                if (!user || user.status != 'Active') {
                    return res.sendStatus(401);
                }

                if (user.password != createHmac('sha256', this.signingKey).update(req.body.password + user.salt).digest('base64')) {
                    return res.sendStatus(401);
                }

                token = randomBytes(50).toString('base64');
                application.db.collection('tokens').insertOne({
                    user: new ObjectID(user._id),
                    token,
                    expireAt: new Date(Date.now() + 30 * 24 * 60 * 60e3),
                    timestamp: new Date()
                });

                res.cookie('x-app-session', token, {
                    httpOnly: true,
                    secure: !!req.headers['x-forwarded-for']
                });

                if (user) {
                    let responseObject = Object.assign(user, {
                        csrfToken: this.createCsrf(token)
                    });

                    delete responseObject.password;
                    delete responseObject.salt;

                    res.send(responseObject);
                }
                else
                    throw new Error('Unauthorized');
            } catch (e) {
                console.log(e);
                res.statusCode = 401;
                res.send({
                    error: 'bad credentials'
                });
            } finally {
                req['user'] = user;
                incrementUserApiCalls(user._id);
                this.logUserActivity(req, token, res);
            }
        });

        this.app.all('/api/*', async (req, res, next) => {
            try {
                if (req['user'] && req['hasCsrf']) {
                    incrementUserApiCalls(req['user']._id);
                    this.logUserActivity(req, null, res);

                    next();
                }
                else
                    throw new Error('Unauthorized');
            } catch (e) {
                console.log(e);
                if (e.statusCode == 401 || e.message == 'Unauthorized') {
                    res.cookie('x-app-session', '', {
                        maxAge: 0,
                        httpOnly: true,
                        secure: !!req.headers['x-forwarded-for']
                    });
                    res.sendStatus(401);
                }
                else
                    res.sendStatus(500);
            }
        });

        require('../controllers/iam').default(this);

        this.app.get('/api/v1/me', async (req, res) => {
            let responseObject = await dbc.collection('users').findOne({ email: req['user'].email });

            delete responseObject.password;
            delete responseObject.salt;

            res.send(responseObject);
        });

        this.app.get('/api/v1/logout', async (req, res) => {
            res.cookie('x-app-session', '', {
                maxAge: 0,
                httpOnly: true,
                secure: !!req.headers['x-forwarded-for']
            });

            this.db.collection('tokens').remove({ token: req.cookies['x-app-session'] });

            res.send('ok');
        });

        let application = this;

        this.app.post('/api/v1/logs', this.permissions([
            'Logs.Read.All'
        ]), async (req, res) => {
            try {
                res.send(await request.post(`${req['backendUrl'].replace(/[\/]*$/, '')}/api/AdminPanel/GetLogs`, {
                    json: true,
                    body: req.body.query,
                    headers: {
                        'x-zumo-master': req['masterKey'],
                        'zumo-api-version': '2.0.0'
                    }
                }));
            } catch (e) {
                console.log(JSON.stringify(e));
                res.sendStatus(500);
            }
        });

        this.app.use(express.static('../public'));
    }
    private loadModules() {
        console.log('Loading modules...');
        const moduleDir = '../node_modules/@lunarade';
        let appendJs = '';
        let appendCss = '';
        let appendPug = [];
        let modules = fs.readdirSync(moduleDir).filter(m => m.match(/^module\-/));
        console.log(`Found ${modules.length} modules.`);
        for (let module of modules) {
            console.log(`Loading ${module}...`);
            try {
                if (fs.existsSync(`${moduleDir}/${module}/dist/index.js`))
                    try { require(`../${moduleDir}/${module}/dist/index`).default(this); } catch (e) { console.log(e); }
                if (fs.existsSync(`${moduleDir}/${module}/src/client/components`))
                    for (let component of fs.readdirSync(`${moduleDir}/${module}/src/client/components`))
                        try {
                            try { appendJs += ';\n' + fs.readFileSync(`${moduleDir}/${module}/src/client/components/${component}/${component}.js`).toString(); } catch (e) { console.log(e); }
                            try { appendCss += '\n' + sass.renderSync({ file: `${moduleDir}/${module}/src/client/components/${component}/${component}.scss` }).css; } catch (e) { console.log(e); }
                            try {
                                if (fs.existsSync(`${moduleDir}/${module}/src/client/components/${component}/${component}.pug`))
                                    appendPug.push(`${moduleDir}/${module}/src/client/components/${component}/${component}.pug`.replace(/^\.\./, ''));
                            } catch (e) { console.log(e); }
                        } catch (e) { console.log(e); }
            } catch (e) { console.log(e); }
        }

        console.log('Bundling components...');
        fs.writeFileSync('../public/_a_bundle.js', appendJs);
        fs.writeFileSync('../public/_a_styles.css', appendCss);
        fs.writeFileSync('../public/bundle.js', fs.readFileSync('../public/_bundle.js').toString() + appendJs);
        fs.writeFileSync('../public/styles.css', fs.readFileSync('../public/_styles.css').toString() + appendCss);

        let indexPug = fs.readFileSync('../index.pug').toString();
        let indentation = indexPug.match(/([ ]*)#DYNAMIC_INCLUDE_PLACEHOLDER/)[1];
        fs.writeFileSync('../_index.pug', indexPug.replace(/#DYNAMIC_INCLUDE_PLACEHOLDER/, appendPug.map(s => `include ${s}`).join('\n' + indentation)));
    }
    private async connectDb() {
        let dbPort = this.configuration.db.port;
        if (typeof (this.configuration.db.ssh) == 'object') {
            dbPort = await getPort();
            await new Promise(async r => tunnel({
                username: this.configuration.db.ssh.user,
                privateKey: fs.readFileSync(this.configuration.db.ssh.privateKey).toString(),
                passphrase: this.configuration.db.ssh.passphrase,
                password: this.configuration.db.ssh.password,
                host: this.configuration.db.ssh.host,
                port: this.configuration.db.ssh.port,
                dstHost: this.configuration.db.host,
                dstPort: this.configuration.db.port,
                localHost: 'localhost',
                localPort: dbPort,
                keepAlive: true
            }, r).on('error', console.log));
            console.log('Tunnel opened.');
        }

        let client = new MongoClient(`mongodb://${this.configuration.db.host}:${dbPort}`, Object.assign({
            useNewUrlParser: true
        }, this.configuration.db.auth, this.configuration.db.ssl));

        dbc = (await client.connect()).db(this.configuration.db.dbName);

        await Promise.all([
            dbc.createIndex('tokens', { expireAt: 1 }, { expireAfterSeconds: 0 }),
            dbc.createIndex('statuses', { expireAt: 1 }, { expireAfterSeconds: 0 }),
            dbc.createIndex('requests', { expireAt: 1 }, { expireAfterSeconds: 0 }),
            dbc.createIndex('requests', { userId: 1 }),
            dbc.createIndex('requests', { userId: 1, _id: 1 }),
            dbc.createIndex('requests', { method: 1 }),
            dbc.createIndex('requests', { 'response.statusCode': 1 }),
            dbc.createIndex('monitors', { timestamp: 1 }),
            dbc.createIndex('monitorRequests', { expireAt: 1 }, { expireAfterSeconds: 0 }),
            dbc.createIndex('monitorRequests', { timestamp: 1 }),
            dbc.createIndex('monitorRequests', { monitorId: 1 }),
            dbc.createIndex('aggregatedMonitorRequestStats', { expireAt: 1 }, { expireAfterSeconds: 0 }),
            dbc.createIndex('aggregatedMonitorRequestStats', { timestamp: 1 }),
            dbc.createIndex('aggregatedMonitorRequestStats', { monitorId: 1 })
        ]);

        console.log('Database connected.');

        let variables = await dbc.collection('variables').find({}).toArray();

        console.log(`Loaded ${variables.length} variables.`);

        let configuration: any = {};

        for (let variable of variables)
            configuration[variable.key] = variable.value;

        this.mandrillApiKey = configuration.MANDRILL_API_KEY;
        this.signingKey = configuration.SIGNING_KEY;

        if (!this.signingKey) {
            this.signingKey = randomBytes(50).toString('base64');
            dbc.collection('variables').insertOne({
                key: 'SIGNING_KEY',
                value: this.signingKey
            });
        }

        console.log('Initialized.');
        this.initialize();
    }
    public logUserActivity(request, token = null, response) {
        let requestInfo = {
            userId: new ObjectID(request.user._id),
            email: request.user.email,
            timestamp: new Date(),
            method: request.method,
            url: request.originalUrl,
            token: token || request.cookies['x-app-session'],
            headers: request.headers,
            body: request.body,
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60e3) // 30 days
        };
        request.requestInfo = requestInfo;
        request.requestInfoQuery = dbc.collection('requests').insertOne(requestInfo);

        var oldWrite = response.write,
            oldEnd = response.end;

        var chunks = [];

        response.write = function (chunk) {
            chunks.push(new Buffer(chunk));

            oldWrite.apply(response, arguments);
        };

        response.end = async function (chunk) {
            if (chunk)
                chunks.push(new Buffer(chunk));

            var body = Buffer.concat(chunks).toString('utf8');

            oldEnd.apply(response, arguments);

            await request.requestInfoQuery;
            await dbc.collection('requests').updateOne({ _id: new ObjectID(requestInfo['_id']) }, {
                $set: {
                    response: {
                        statusCode: response.statusCode,
                        headers: response._headers,
                        timestamp: new Date()
                    }
                }
            });
            // We write the body separately because it might fail due to document size limitations
            dbc.collection('requests').updateOne({ _id: new ObjectID(requestInfo['_id']) }, {
                $set: { 'response.body': body }
            });
        };
    }
}