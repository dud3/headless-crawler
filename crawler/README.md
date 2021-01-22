# install

For detailed installation guide please check [INSTALL.md](https://gitlab.com/kagi-search-engine/ranker/-/blob/master/crawler/INSTALL.md)

### Requirements
```
nodejs 14*
npm 6*
yarn
```

### Node
```
yran isntall
cp env.example .env # Replace localhost with crawler's ip address
```

### Headless chromium
https://gist.githubusercontent.com/ipepe/94389528e2263486e53645fa0e65578b/raw/9c5e0e3bc529d8717d38c589be112505f1604710/install-chrome-headless.sh


### Crawler shell

**Default config:**
```
--headless=true     // headless or not
--instances=1       // number of instance (disabled currently)
--tabs=4            // number of tabs
--closetab=false    // close tabs after tab process
--waitfor=3000      // wait for x ms after page.goto(...)
--timeout=60000,    // wait x ms for page to respond
--syncerrors: "",   // work in progress... (disabled currently)
--synctimeouts=false // sync timed out pages
--debug"=false      // debug mode
```

**Run**
```
yran shell --tabs=8 --waitfor=3000
```

### Servers

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

# Web client
To be able to test the extractor api:
- Run the servers above (http, socket)
- Load the `test-http-server.html` or `test-socket-server.html` from the `clients` folder
