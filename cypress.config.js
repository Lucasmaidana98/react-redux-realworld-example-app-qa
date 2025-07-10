const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4100',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    downloadsFolder: 'cypress/downloads',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    taskTimeout: 60000,
    execTimeout: 60000,
    env: {
      apiUrl: 'https://conduit.productionready.io/api',
      testUser: {
        username: 'testuser_' + Date.now(),
        email: 'testuser_' + Date.now() + '@test.com',
        password: 'testpassword123'
      }
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        }
      });
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
  },
});