"use strict"

const { compareLoose } = require('semver');



const C2S = require('./index.js'),
      c2s = new C2S('https://test11.andxor.it/c2s_test/api/','f.gorla@andxor.it', '123456');

let p={username: 'f.gorla@andxor.it', password:'123456'};
let data = {};
let mySessionTrack = {}
Promise.resolve(c2s.login(p)).then(function (data) { 
     
    // don't know the code stiling that's needed here
    mySessionTrack = data;
     p = {};
     p.token = mySessionTrack.token;
     p.cid = mySessionTrack.user.companies[0].cid;
     // p.dateMin = 1598542564677;
     p.meta = { name: "owner", value: "federico"};
     console.log("prima di list workflow: ",p);
     Promise.resolve(c2s.listWorkflows(p)).then (function (data) { console.log("lista workflow: \r\n", data) });


 
}).then(function () {c2s.logout(p)});


