import { Lunarade } from "@lunarade/core";
import { ObjectID } from "mongodb";

export default function (application: Lunarade.Application) {
    application.app.get('/api/v1/iam/all', application.permissions([
        'IAM.ReadWrite.All'
    ]), async (req, res) => {
        try {
            let [users, roles, permissions] = await Promise.all([
                application.db.collection('users').find({}).toArray(),
                application.db.collection('roles').find({}).toArray(),
                application.db.collection('permissions').find({}).toArray()
            ]);

            res.send({ users: users.reverse(), roles: roles.reverse(), permissions: permissions.reverse() });
        } catch (e) {
            console.log(e);
            res.sendStatus(500);
        }
    });

    application.app.get('/api/v1/iam/user/:userId/history', application.permissions([
        'IAM.ReadWrite.All'
    ]), async (req, res) => {
        try {
            let qo = Object.assign({
                userId: new ObjectID(req.params.userId)
            }, req.query.term && req.query.term.trim() ? {
                $or: [
                    { url: new RegExp(req.query.term) },
                    { 'response.body': new RegExp(req.query.term) },
                    { 'request.body': new RegExp(req.query.term) },
                    { method: req.query.term },
                    { 'response.statusCode': req.query.term }
                ]
            } : {});
            res.send(await application.db.collection('requests').find(qo).sort({ _id: -1 }).limit(50).toArray());
        } catch (e) {
            console.log(e);
            res.sendStatus(500);
        }
    });

    application.app.post('/api/v1/iam/users', application.permissions([
        'IAM.ReadWrite.All'
    ]), application.logAction, async (req, res) => {
        try {
            if (req.body.action == 'delete')
                await application.db.collection('users').remove({ _id: new (require('mongodb').ObjectID)(req.body.ID) });
            else if (req.body.ID) {
                let id = req.body.ID;
                delete req.body.ID;
                delete req.body.action;
                if ('role' in req.body) {
                    let role = await application.db.collection('roles').findOne({ name: req.body.role });
                    req.body.permissions = role.permissions;
                }
                if (Object.keys(req.body).length)
                    await application.db.collection('users').updateOne({ _id: new (require('mongodb').ObjectID)(id) }, { $set: req.body });
            }
            else if ('ID' in req.body) {
                delete req.body.ID;
                delete req.body.action;
                if (Object.keys(req.body).length) {
                    if (!req.body.permissions)
                        req.body.permissions = [];
                    await application.db.collection('users').insertOne(req.body);
                }
            }

            res.send(req.body);
        } catch (e) {
            console.log(e);
            res.sendStatus(500);
        }
    });

    application.app.post('/api/v1/iam/permissions', application.permissions([
        'IAM.ReadWrite.All'
    ]), application.logAction, async (req, res) => {
        try {
            if (req.body.action == 'delete')
                await application.db.collection('permissions').remove({ _id: new (require('mongodb').ObjectID)(req.body.ID) });
            else if (req.body.ID) {
                let id = req.body.ID;
                delete req.body.ID;
                delete req.body.action;
                if (Object.keys(req.body).length)
                    await application.db.collection('permissions').updateOne({ _id: new (require('mongodb').ObjectID)(id) }, { $set: req.body });
            }
            else if ('ID' in req.body) {
                delete req.body.ID;
                delete req.body.action;
                if (Object.keys(req.body).length)
                    await application.db.collection('permissions').insertOne(req.body);
            }

            res.send(req.body);
        } catch (e) {
            console.log(e);
            res.sendStatus(500);
        }
    });

    application.app.post('/api/v1/iam/roles', application.permissions([
        'IAM.ReadWrite.All'
    ]), application.logAction, async (req, res) => {
        try {
            if (req.body.action == 'delete')
                await application.db.collection('roles').remove({ _id: new (require('mongodb').ObjectID)(req.body.ID) });
            else if (req.body.ID) {
                let id = req.body.ID;
                delete req.body.ID;
                delete req.body.action;
                if (Object.keys(req.body).length)
                    await application.db.collection('roles').updateOne({ _id: new (require('mongodb').ObjectID)(id) }, { $set: req.body });
                if ('permissions' in req.body) {
                    let role = await application.db.collection('roles').findOne({ _id: new (require('mongodb').ObjectID)(id) });
                    let usersWithThisRole = await application.db.collection('users').find({ role: role.name }).toArray();

                    for (let user of usersWithThisRole)
                        await application.db.collection('users').updateOne({ _id: new (require('mongodb').ObjectID)(user._id) }, { $set: { permissions: req.body.permissions } });
                }
            }
            else if ('ID' in req.body) {
                delete req.body.ID;
                delete req.body.action;
                if (Object.keys(req.body).length)
                    await application.db.collection('roles').insertOne(req.body);
            }

            res.send(req.body);
        } catch (e) {
            console.log(e);
            res.sendStatus(500);
        }
    });
}