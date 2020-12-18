# install

### Requirements
```
nodejs
npm
yarn
mysql
```

### Node
```
npm install @types/puppeteer
npm install -g socket.io
yran isntall
```

### Headless chromium
https://gist.githubusercontent.com/ipepe/94389528e2263486e53645fa0e65578b/raw/9c5e0e3bc529d8717d38c589be112505f1604710/install-chrome-headless.sh

# Servers

### http server
```
yarn start-http-server
// Post request to: http://localhost:3000/url { url: 'https://the.url' }
// Check the test-http-server.html for the sample usage.
```

### sockets server
```
yarn start-socket-server
```

### comamnd line usage
```
yran shell

"--headless": Boolean,
"--instances": Integer (number of chrome intsances)
"--tabs": Integer, (number of tabs per instance)
"--sites": Integer, (number of sites to crawl)
"--waitfor": Integer (ms after puppeteer page.goto())
"--timeout": Integer (ms puppeteer page.goto() timeout)
```

# Web client
To be able to test the extractor api:
- Run the servers above (http, socket)
- Load the `test-http-server.html` or `test-socket-server.html` from the `clients` folder
