class BrowserHandler {
    constructor (headless) {
      this.browsers = []; // array of puppeteer instances
    }

    get () {
      return this.browsers;
    },

    create (browser) {
      this.browsers.push(brwoser);
    },

    remove (i) {
      this.browsers.slice(i, 1);
    }
}

export default BrowserHandler;
