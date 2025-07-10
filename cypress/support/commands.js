// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/**
 * Custom command to select DOM element by data-cy attribute.
 * @example cy.dataCy('submit-btn')
 */
Cypress.Commands.add('dataCy', (value) => {
  return cy.get(`[data-cy=${value}]`);
});

/**
 * Custom command to select DOM element by data-testid attribute.
 * @example cy.dataTestId('submit-btn')
 */
Cypress.Commands.add('dataTestId', (value) => {
  return cy.get(`[data-testid=${value}]`);
});

/**
 * Custom command to wait for page to be loaded
 */
Cypress.Commands.add('waitForPageLoad', () => {
  cy.document().should('have.property', 'readyState', 'complete');
  cy.get('.loading', { timeout: 10000 }).should('not.exist');
});

/**
 * Custom command to check if element contains specific text
 */
Cypress.Commands.add('shouldContainText', { prevSubject: 'element' }, (subject, text) => {
  cy.wrap(subject).should('contain.text', text);
});

/**
 * Custom command to type slowly (useful for inputs that validate on change)
 */
Cypress.Commands.add('typeSlowly', { prevSubject: 'element' }, (subject, text, options = {}) => {
  const chars = text.split('');
  chars.forEach(char => {
    cy.wrap(subject).type(char, { delay: 50, ...options });
  });
});

/**
 * Custom command to clear and type
 */
Cypress.Commands.add('clearAndType', { prevSubject: 'element' }, (subject, text) => {
  cy.wrap(subject).clear().type(text);
});

/**
 * Custom command to scroll to element and click
 */
Cypress.Commands.add('scrollAndClick', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).scrollIntoView().should('be.visible').click();
});

/**
 * Custom command to wait for element to be visible and enabled before clicking
 */
Cypress.Commands.add('safeClick', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject)
    .should('be.visible')
    .should('not.be.disabled')
    .click();
});

/**
 * Custom command to check network requests
 */
Cypress.Commands.add('waitForAPI', (alias, timeout = 10000) => {
  cy.wait(alias, { timeout });
});

/**
 * Custom command to verify page title
 */
Cypress.Commands.add('verifyPageTitle', (title) => {
  cy.title().should('contain', title);
});

/**
 * Custom command to verify URL contains specific path
 */
Cypress.Commands.add('verifyURL', (path) => {
  cy.url().should('include', path);
});