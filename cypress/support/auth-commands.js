/**
 * Authentication related custom commands
 */

/**
 * Register a new user via API
 */
Cypress.Commands.add('registerUser', (userDetails = {}) => {
  const user = {
    username: userDetails.username || 'testuser_' + Date.now(),
    email: userDetails.email || 'testuser_' + Date.now() + '@test.com',
    password: userDetails.password || 'testpassword123',
    ...userDetails
  };

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/users`,
    body: {
      user: user
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200 || response.status === 201) {
      // Store user credentials for the session
      cy.window().then((win) => {
        win.localStorage.setItem('jwt', response.body.user.token);
      });
      return cy.wrap(response.body.user);
    } else {
      cy.log('Registration failed:', response.body);
      return cy.wrap(null);
    }
  });
});

/**
 * Login user via API
 */
Cypress.Commands.add('loginUserAPI', (credentials) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/users/login`,
    body: {
      user: {
        email: credentials.email,
        password: credentials.password
      }
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200) {
      // Store token in localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('jwt', response.body.user.token);
      });
      return cy.wrap(response.body.user);
    } else {
      cy.log('Login failed:', response.body);
      return cy.wrap(null);
    }
  });
});

/**
 * Login user via UI
 */
Cypress.Commands.add('loginUserUI', (credentials) => {
  cy.visit('/login');
  cy.waitForPageLoad();
  
  cy.get('[placeholder="Email"]').clearAndType(credentials.email);
  cy.get('[placeholder="Password"]').clearAndType(credentials.password);
  cy.get('.auth-page .btn-primary').safeClick();
  
  // Wait for redirect to home page
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
  cy.get('.navbar .nav-link').should('contain', credentials.username || 'testuser');
});

/**
 * Register user via UI
 */
Cypress.Commands.add('registerUserUI', (userDetails) => {
  cy.visit('/register');
  cy.waitForPageLoad();
  
  cy.get('[placeholder="Your Name"]').clearAndType(userDetails.username);
  cy.get('[placeholder="Email"]').clearAndType(userDetails.email);
  cy.get('[placeholder="Password"]').clearAndType(userDetails.password);
  cy.get('.auth-page .btn-primary').safeClick();
  
  // Wait for redirect to home page
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
  cy.get('.navbar .nav-link').should('contain', userDetails.username);
});

/**
 * Logout user
 */
Cypress.Commands.add('logoutUser', () => {
  cy.visit('/settings');
  cy.waitForPageLoad();
  cy.get('.btn-outline-danger').contains('Or click here to logout').safeClick();
  
  // Verify logout
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
  cy.get('.navbar .nav-link').should('contain', 'Sign in');
});

/**
 * Check if user is authenticated
 */
Cypress.Commands.add('isAuthenticated', () => {
  return cy.window().then((win) => {
    return !!win.localStorage.getItem('jwt');
  });
});

/**
 * Get current user token
 */
Cypress.Commands.add('getCurrentUserToken', () => {
  return cy.window().then((win) => {
    return win.localStorage.getItem('jwt');
  });
});

/**
 * Set authentication token manually
 */
Cypress.Commands.add('setAuthToken', (token) => {
  cy.window().then((win) => {
    win.localStorage.setItem('jwt', token);
  });
});

/**
 * Clear authentication
 */
Cypress.Commands.add('clearAuth', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('jwt');
    win.sessionStorage.clear();
  });
});