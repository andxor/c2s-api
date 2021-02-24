"use strict"

const { compareLoose } = require('semver');



const C2S = require('./index.js'),
      c2s = new C2S('https://test11.andxor.it/c2s_test/api/','f.gorla@andxor.it', '123456');

let p={username: 'f.gorla@andxor.it', password:'123456'};
let data = {};
let mySessionTrack = {}
console.log('---------------------');
console.log(' C2S Api Wrapper Test');
console.log('---------------------');

Promise.resolve(c2s.login(p)).then(function (data) { 
     
    console.log('1) Logged in.    The token is',p.token);
    mySessionTrack = data;
     p = {};
     p.token = mySessionTrack.token;
     p.cid = mySessionTrack.user.companies[0].cid;
     p.dateMin = 1598542564677; // mandatory
     // p.meta = { name: "owner", value: "federico"}; // this is not mandatory for listWorkflows
     return c2s.listWorkflows(p);
}).then(function(data) {
    console.log("2) worflow list ottenuta.      il primo wfid:",data.workflows[0].wfid);
    mySessionTrack.wfid = data.workflows[0].wfid;
    p.token = mySessionTrack.token;
    p.wfid = mySessionTrack.wfid;
    return c2s.downloadWorkflow(p);
}).then(function(data) {
    console.log("3) Eseguito downloadWorkFlow \r\n",data);
    return c2s.logout(p);
}).then(function(data) {
    console.log('4) Logged out');
})