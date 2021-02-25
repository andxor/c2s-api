/*!
* node cloud2sign API wrapper
* (c) 2021 andxor srl
*/

'use strict'

const
    Q = require('Bluebird'),            // I use bluebird for the moment
    reProto = /^(https?):/,             // regular expression for protocol check
    req = require('superagent');        // ajax API caller
    

function C2S(address, username, password) {
    this.address = address.replace(/\/?$/, '/');
    this.username = username;
    this.password = password;
    const proto = reProto.exec(address);
    if (!proto)
        throw new Error('Unsupported protocol.');   // we want only Https
    this.agent = new (require(proto[1])).Agent({
        keepAlive: true,
        keepAliveMsecs: 5000,
        maxSockets: 4,
    }); 
}

C2S.Error = function(method, err) {
    // like the one in TDoc-api, this too is inspired by: http://stackoverflow.com/a/8460753/166524
    if ('captureStackTrace' in Error)
    Error.captureStackTrace(this, this.constructor);
    this.name = 'c2s.Error';
    this.method = method;
    this.status = 0 | err.status;
    try {
        //TODO: does this actually happen?
        if ('code' in err.response.body)
            err = err.response.body;
    } catch (e) {
        // ignore
    }
    this.code = 0 | err.code;
    this.message = err.message;
    this.additional = err.additional || [];
}

C2S.Error.prototype = Object.create(Error.prototype);
C2S.Error.prototype.constructor = C2S.Error;
   

function GET(me, method, data) {
    return Q.resolve(req
        .get(me.address + method)
        .agent(me.agent)
        .auth(me.username, me.password)
        .query(data)
    ).catch(function (err) {
        throw new C2S.Error(method, err);
    }).then(function (resp) {
        const data = resp.body;
        if (typeof data == 'object' && 'message' in data)
            throw new C2S.Error(method, resp);
        if (resp.status >= 400)
            throw new C2S.Error(method, resp);
        return data;
    });
}

function POST(me, method, data) {
    return Q.resolve(req
        .post(me.address + method)
        .agent(me.agent)
        .auth(me.username, me.password)
        .type('application/json')
        .send(data)
    ).catch(function (err) {
        throw new C2S.Error(method, err);
    }).then(function (resp) {
        const data = resp.body;
        if (typeof data == 'object' && 'message' in data)
            throw new C2S.Error(method, data.code, data.message);
        return data;
    });
}

function POSTzip(me, method, data) {
    return Q.resolve(req
        .post(me.address + method)
        .agent(me.agent)
        .auth(me.username, me.password)
        .type('application/json')
        .accept('application/zip')
        .send(data)
        .buffer(true)
        .parse(req.parse.image)
    ).catch(function (err) {
        throw new C2S.Error(method, err);
    }).then(function (resp) {
        return resp.body;
    });
}

function login(me, p) {
  const data = {};
  if (p.username) data.username = p.username; else return Q.reject(new Error('you need to specify ‘username’'));
  if (p.password) data.password = p.password; else return Q.reject(new Error('you need to specify ‘password’'));
  return POST(me, 'login', data).then(function (data) {
        if (data.loginSuccessful) {
            p.token = data.token;
            me.token = p.token;
        } else {
            p.token = undefined;
            me.token = undefined;
        }
        return data;    
  });
}

function logout(me, p){
    const data = {};
    if (p.token) data.token = p.token; else return Q.reject(new Error('you need to specify ‘token’'));
    return POST(me, 'logout', data).then(function (data) {
        if (data.logoutSuccessful) {
            me.token = undefined;
            p.token = undefined;
        }
        return data;
    });
}

function listWorkflows(me, p){
    const data = {};
    if (p.token) data.token = p.token; else return Q.reject(new Error('you need to specify ‘token’'));
    if (p.cid) data.cid = p.cid; else return Q.reject(new Error('you need to specify ‘cid’'));
    if (p.dateMin) data.dateMin = p.dateMin; else return Q.reject(new Error('at leaste ‘dateMin’ is mandatory field'));
    if (p.dateMax) data.dateMax = p.dateMax;
    if (p.meta) data.meta = p.meta;
    return POST(me,'listWorkflows',data);
}

function createWorkflow(me, p){
    const data = {};
    if (p.token) data.token = p.token; else return Q.reject(new Error('you need to specify ‘token’'));
    if (p.cid) data.cid = p.cid; else return Q.reject(new Error('you need to specify ‘cid’'));
    if (p.name) data.name = p.name; else return Q.reject(new Error('you need to specify ‘name’'));
    if (p.steps) data.steps = p.steps; else return Q.reject(new Error('you need to specify ‘steps[]’'));
    if (p.documents) data.documents = p.documents;
    if (p.attachments) data.attachments = p.attachments;

    return POST(me,'createWorkflow',data);
}

function downloadWorkflow(me, p){
    const data = {};
    if (p.token) data.token = p.token; else return Q.reject(new Error('you need to specify ‘token’'));
    if (p.wfid) data.wfid = p.wfid; else return Q.reject(new Error('you need to specify ‘wfid’'));
    return POSTzip(me,'downloadWorkflow',data);
}

[
    login,
    logout,
    listWorkflows,
    createWorkflow,
    downloadWorkflow,
].forEach(function (f) {
    C2S.prototype[f.name] = function (p) {
        if (typeof p != 'object')
            throw new Error('The parameter must be an object.');
        return f(this, p).nodeify(p.callback);
    };
});

module.exports = C2S;    