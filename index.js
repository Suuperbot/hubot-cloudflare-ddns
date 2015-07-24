// Description
//   Hubot will update its DNS name when it changes (or shortly thereafter)
//
// Dependencies:
//   "native-dns": "^0.7.0"
//   "tldjs": "^1.5.3"
//   "got": "^3.3.1"
//   "cloudflare-ddns": "^1.0.0"
//
// Commands:
//   hubot hostname - Hubot will reply with its hostname.
//   hubot ip - Hubot will reply with its ip address.
//
// Author:
//   Greg Cochard <greg@gregcochard.com>

var dns = require('native-dns');
var tldjs = require('tldjs');
var CfDdns = require('cloudflare-ddns');
var got = require('got');
var cfDomain = tldjs.getDomain(process.env.HUBOT_DNS_NAME);
var dnsCfg = {
  cloudflare: {
    token: process.env.CLOUDFLARE_TOKEN,
    email: process.env.CLOUDFLARE_EMAIL,
    domain: cfDomain
  },
  records: {},
  pushover: {}
};
dnsCfg.records[process.env.HUBOT_DNS_NAME] = 'A';

var hubotDns = new CfDdns(dnsCfg);

function setCf(name, addr){
  got('http://canhazip.com/', {
      headers: {
        'user-agent': 'https://github.com/gcochard/hubot-cloudflare-ddns'
      }
  }, function(err, ip){
    ip = ip.trim();
    addr = addr.trim();
    if(err){
      return console.error(err);
    }
    if(addr !== ip){
      hubotDns.sync();
    }
  });
}

var authNs = '';
var currIp = '';

function lookupDns(){
  var ip = '';
  var ttl = 3600 * 1000;
  var host = process.env.HUBOT_DNS_NAME;
  var question = dns.Question({ name: host, type: 'A'});
  var start = Date.now();
  var req = dns.Request({
    question: question,
    server: { address: '8.8.8.8', port: 53, type: 'udp' },
    timeout: 10000
  });
  req.on('timeout', function(){
    console.log('timeout, waiting 10 seconds to try again');
    setTimeout(req.send.bind(req), 10000);
  });
  req.on('message', function(err, answer){
    answer.answer.forEach(function(a){
      console.dir(a);
      ip = a.address;
      currIp = ip;
      ttl = a.ttl * 1000;
    });
  });
  req.on('end', function(){
    var delta = (Date.now()) - start;
    console.log('finished processing request: ' + delta.toString() + 'ms');
    setCf(host, ip);
    console.log('waiting %d seconds to check again', ttl/1000);
    setTimeout(lookupDns, ttl);
  });
  req.send();
}
// first things first, get the authoritative nameserver
function getNs(){
  var question = dns.Question({ name: cfDomain, type: 'NS'});

  var start = Date.now();
  var req = dns.Request({
    question: question,
    server: { address: '8.8.8.8', port: 53, type: 'udp' },
    timeout: 10000
  });
  req.on('timeout', function(){
    console.log('timeout, waiting 10 seconds to try again');
    setTimeout(req.send.bind(req), 10000);
  });
  req.on('message', function(err, answer){
    answer.answer.forEach(function(a){
      console.dir(a);
      authNs = a.address;
    });
  });
  req.on('end', function(){
    var delta = (Date.now()) - start;
    console.log('finished processing request: ' + delta.toString() + 'ms');
    lookupDns();
  });
  req.send();
}
getNs();

module.exports = function(robot){
  robot.respond(/hostname/i, function(msg){
    return msg.reply(process.env.HUBOT_DNS_NAME);
  });
  robot.respond(/ip/i, function(msg){
    return msg.reply(currIp);
  });
};
