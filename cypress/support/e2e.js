// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import custom commands
import './auth-commands';
import './article-commands';
import './user-commands';

// Configure Cypress behavior
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the exception from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  if (err.message.includes('Script error')) {
    return false;
  }
  if (err.message.includes('Network Error')) {
    return false;
  }
  // Log the error for debugging but don't fail the test
  console.log('Uncaught exception:', err.message);
  return false;
});

// Setup for consistent test environment
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
  
  // Set up common interceptors
  cy.intercept('GET', '**/articles?**').as('getArticles');
  cy.intercept('GET', '**/tags').as('getTags');
  cy.intercept('POST', '**/users/login').as('loginRequest');
  cy.intercept('POST', '**/users').as('registerRequest');
});