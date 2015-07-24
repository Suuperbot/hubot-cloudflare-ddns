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
  records: {}
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

function lookupDns(){
  var ip = '';
  var ttl = 3600 * 1000;
  var host = process.env.HUBOT_DNS_NAME;
  var question = dns.Question({ name: host, type: 'A'});
  var start = Date.now();
  var req = dns.Request({
    question: question,
    server: { address: '8.8.8.8', port: 53, type: 'udp' },
    timeout: 1000
  });
  req.on('timeout', function(){
    console.log('timeout, waiting 10 seconds to try again');
    setTimeout(req.send, 10000);
  });
  req.on('message', function(err, answer){
    answer.answer.forEach(function(a){
      console.dir(a);
      ip = a.address;
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
    timeout: 1000
  });
  req.on('timeout', function(){
    console.log('timeout, waiting 10 seconds to try again');
    setTimeout(req.send, 10000);
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
