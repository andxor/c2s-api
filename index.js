/*!
* node cloud2sign API wrapper
* (c) 2021 andxor srl
*/

"use strict"

// const { send } = require('process');
const zlib = require('zlib');

const
    Q = require('Bluebird'),            // my workaround to nodeify didn't work, so I use bluebird for the moment
    req = require('superagent'),        // novice note: ajax API caller
    reProto = /^(https?):/,             // novice note: regular expression for protocol check
    crypto = require('crypto'),         // don't know if it's necessary
    reEtag = /^"([0-9A-F]+)[-"]/;       // idem

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
    console.log('--- POSTzip entry \r\nmethod:',method,'\r\ndata:',data);
    let buf = '';
    return Q.resolve(req
        .post(me.address + method)
        .agent(me.agent)
        .auth(me.username, me.password)
        .type('application/json')
        .accept('application/zip')
        .send(data)
        .buffer()
        .parse(function (res, fn) {
            res.on('data', (chunk) => {
                buf +=chunk;
                console.log('Sto ricevendo dati', buf.length); // <- debug               
            });
            res.on('end', () =>{ 
                console.log('termine');
                const buff = Buffer.from(buf, "utf-8");
                zlib.unzip(buff, (err, buff) => { 
                    console.log('ERR: ',err);
                    console.log('BUFF: ',buff); 
                  }); 
                console.log('buf: ',buf);
            });
        })
    ).catch(function (err) {
        throw new C2S.Error(method, err);
    }).then(function (resp) {
        console.log('--- PostZip THEN');  // <- debug
        // console.log('resp;',resp);        // <- debug  
        const data = resp.body.toString();
        console.log(data);
        // if (typeof data == 'object' && 'message' in data)
           //  throw new C2S.Error(method, data.code, data.message);
        return data;
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
    if (p.token) data.token = p.token;
    if (p.cid) data.cid = p.cid;
    if (p.dateMin) data.dateMin = p.dateMin;
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