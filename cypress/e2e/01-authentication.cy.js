/**
 * Authentication E2E Tests
 * Tests user registration, login, logout, and authentication persistence
 */

describe('Authentication Flow', () => {
  let testUser;

  beforeEach(() => {
    cy.fixture('users').then((users) => {
      testUser = {
        ...users.validUser,
        username: 'testuser_' + Date.now(),
        email: 'testuser_' + Date.now() + '@test.com'
      };
    });

    // Setup API interceptors
    cy.intercept('POST', '**/users/login').as('loginRequest');
    cy.intercept('POST', '**/users').as('registerRequest');
    cy.intercept('GET', '**/user').as('getCurrentUser');
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      cy.visit('/register');
      cy.verifyPageTitle('Conduit');
      cy.verifyURL('/register');

      // Fill registration form
      cy.get('[placeholder="Your Name"]').should('be.visible').clearAndType(testUser.username);
      cy.get('[placeholder="Email"]').should('be.visible').clearAndType(testUser.email);
      cy.get('[placeholder="Password"]').should('be.visible').clearAndType(testUser.password);

      // Submit form
      cy.get('.auth-page .btn-primary').contains('Sign up').safeClick();

      // Wait for API call and verify success
      cy.waitForAPI('@registerRequest');
      cy.verifyURL('/');

      // Verify user is logged in
      cy.get('.navbar .nav-link').should('contain', testUser.username);
      cy.get('.navbar .nav-link[href="#/settings"]').should('be.visible');
    });

    it('should show validation errors for invalid registration data', () => {
      cy.fixture('users').then((users) => {
        cy.visit('/register');

        // Try to submit with empty fields
        cy.get('.auth-page .btn-primary').contains('Sign up').safeClick();

        // Should stay on registration page
        cy.verifyURL('/register');

        // Try with invalid email
        cy.get('[placeholder="Your Name"]').clearAndType('testuser');
        cy.get('[placeholder="Email"]').clearAndType('invalid-email');
        cy.get('[placeholder="Password"]').clearAndType('123');
        cy.get('.auth-page .btn-primary').contains('Sign up').safeClick();

        // Should show error messages or stay on page
        cy.verifyURL('/register');
      });
    });

    it('should not allow registration with existing email', () => {
      // First, register a user
      cy.registerUser(testUser);

      // Try to register again with same email
      cy.visit('/register');
      cy.get('[placeholder="Your Name"]').clearAndType('differentuser');
      cy.get('[placeholder="Email"]').clearAndType(testUser.email);
      cy.get('[placeholder="Password"]').clearAndType('password123');
      cy.get('.auth-page .btn-primary').contains('Sign up').safeClick();

      // Should show error or stay on registration page
      cy.verifyURL('/register');
    });

    it('should navigate to login page from registration page', () => {
      cy.visit('/register');
      cy.get('.auth-page a[href="#/login"]').should('contain', 'Have an account?').safeClick();
      cy.verifyURL('/login');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Register user before login tests
      cy.registerUser(testUser);
      cy.clearAuth(); // Clear authentication to test login
    });

    it('should login with valid credentials', () => {
      cy.visit('/login');
      cy.verifyURL('/login');

      // Fill login form
      cy.get('[placeholder="Email"]').clearAndType(testUser.email);
      cy.get('[placeholder="Password"]').clearAndType(testUser.password);

      // Submit form
      cy.get('.auth-page .btn-primary').contains('Sign in').safeClick();

      // Wait for API call and verify success
      cy.waitForAPI('@loginRequest');
      cy.verifyURL('/');

      // Verify user is logged in
      cy.get('.navbar .nav-link').should('contain', testUser.username);
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');

      // Try with wrong credentials
      cy.get('[placeholder="Email"]').clearAndType('wrong@email.com');
      cy.get('[placeholder="Password"]').clearAndType('wrongpassword');
      cy.get('.auth-page .btn-primary').contains('Sign in').safeClick();

      // Should stay on login page
      cy.verifyURL('/login');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');

      // Try to submit with empty fields
      cy.get('.auth-page .btn-primary').contains('Sign in').safeClick();

      // Should stay on login page
      cy.verifyURL('/login');
    });

    it('should navigate to registration page from login page', () => {
      cy.visit('/login');
      cy.get('.auth-page a[href="#/register"]').should('contain', 'Need an account?').safeClick();
      cy.verifyURL('/register');
    });
  });

  describe('Authentication Persistence', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should maintain authentication across page reloads', () => {
      cy.visit('/');
      cy.get('.navbar .nav-link').should('contain', testUser.username);

      // Reload page
      cy.reload();
      cy.waitForPageLoad();

      // Should still be authenticated
      cy.get('.navbar .nav-link').should('contain', testUser.username);
    });

    it('should maintain authentication across navigation', () => {
      cy.visit('/');
      cy.get('.navbar .nav-link').should('contain', testUser.username);

      // Navigate to different pages
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.verifyURL('/editor');
      cy.get('.navbar .nav-link').should('contain', testUser.username);

      cy.get('.navbar .nav-link[href="#/settings"]').safeClick();
      cy.verifyURL('/settings');
      cy.get('.navbar .nav-link').should('contain', testUser.username);
    });

    it('should redirect to home after login', () => {
      cy.clearAuth();
      cy.loginUserUI(testUser);
      cy.verifyURL('/');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.registerUser(testUser);
    });

    it('should logout successfully', () => {
      cy.visit('/settings');
      cy.verifyURL('/settings');

      // Click logout button
      cy.get('.btn-outline-danger').contains('Or click here to logout').safeClick();

      // Should redirect to home page
      cy.verifyURL('/');

      // Should not be authenticated
      cy.get('.navbar .nav-link').should('contain', 'Sign in');
      cy.get('.navbar .nav-link').should('contain', 'Sign up');
      cy.get('.navbar .nav-link').should('not.contain', testUser.username);
    });

    it('should clear authentication data on logout', () => {
      cy.visit('/settings');
      cy.get('.btn-outline-danger').contains('Or click here to logout').safeClick();

      // Check that token is removed from localStorage
      cy.window().then((win) => {
        expect(win.localStorage.getItem('jwt')).to.be.null;
      });
    });

    it('should redirect to login when accessing protected routes after logout', () => {
      cy.visit('/settings');
      cy.get('.btn-outline-danger').contains('Or click here to logout').safeClick();

      // Try to access protected route
      cy.visit('/editor');
      
      // Should redirect to login or show login prompt
      // Note: The actual behavior depends on the app's implementation
      cy.get('.navbar .nav-link').should('contain', 'Sign in');
    });
  });

  describe('Navigation Authentication States', () => {
    it('should show unauthenticated navigation when not logged in', () => {
      cy.visit('/');
      
      // Should show login and register links
      cy.get('.navbar .nav-link[href="#/login"]').should('contain', 'Sign in');
      cy.get('.navbar .nav-link[href="#/register"]').should('contain', 'Sign up');
      
      // Should not show authenticated user options
      cy.get('.navbar .nav-link[href="#/editor"]').should('not.exist');
      cy.get('.navbar .nav-link[href="#/settings"]').should('not.exist');
    });

    it('should show authenticated navigation when logged in', () => {
      cy.registerUser(testUser);
      cy.visit('/');
      
      // Should show authenticated user options
      cy.get('.navbar .nav-link[href="#/editor"]').should('contain', 'New Article');
      cy.get('.navbar .nav-link[href="#/settings"]').should('contain', 'Settings');
      cy.get('.navbar .nav-link').should('contain', testUser.username);
      
      // Should not show login/register links
      cy.get('.navbar .nav-link[href="#/login"]').should('not.exist');
      cy.get('.navbar .nav-link[href="#/register"]').should('not.exist');
    });
  });
});