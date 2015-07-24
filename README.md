# hubot-cloudflare-ddns
Hubot will update its DNS name when it changes (or shortly thereafter)

## Setup:

- Set `HUBOT_DNS_NAME` to the domain name you want to point to your hubot instance.
- Set `CLOUDFLARE_TOKEN` to your cloudflare token.
- Set `CLOUDFLARE_EMAIL` to your cloudflare email assocated with the domain.

## Usage:

This module exports two commands, `hostname` and `ip`, which will respond with the domain name and ip address respectively.
