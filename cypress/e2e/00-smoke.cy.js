/**
 * Smoke Tests
 * Basic tests to verify the application loads and core functionality works
 */

describe('Smoke Tests', () => {
  
  it('should load the application successfully', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.get('.navbar').should('be.visible');
    cy.get('.navbar-brand').should('contain', 'conduit');
  });

  it('should display the home page correctly', () => {
    cy.visit('/');
    cy.get('.container').should('be.visible');
    
    // Should see navigation elements
    cy.get('.navbar .nav-link[href="#/"]').should('contain', 'Home');
    cy.get('.navbar .nav-link[href="#/login"]').should('contain', 'Sign in');
    cy.get('.navbar .nav-link[href="#/register"]').should('contain', 'Sign up');
  });

  it('should navigate to login page', () => {
    cy.visit('/');
    cy.get('.navbar .nav-link[href="#/login"]').click();
    cy.url().should('include', '/login');
    cy.get('.auth-page').should('be.visible');
    cy.get('h1').should('contain', 'Sign in');
  });

  it('should navigate to register page', () => {
    cy.visit('/');
    cy.get('.navbar .nav-link[href="#/register"]').click();
    cy.url().should('include', '/register');
    cy.get('.auth-page').should('be.visible');
    cy.get('h1').should('contain', 'Sign up');
  });

  it('should load popular tags', () => {
    cy.visit('/');
    cy.get('.sidebar').should('be.visible');
    cy.get('.sidebar p').should('contain', 'Popular Tags');
    
    // Wait for tags to load (may take a moment)
    cy.get('.tag-list', { timeout: 10000 }).should('be.visible');
  });

  it('should display article feed', () => {
    cy.visit('/');
    
    // Should see feed toggle
    cy.get('.feed-toggle', { timeout: 10000 }).should('be.visible');
    cy.get('.feed-toggle .nav-link').should('contain', 'Global Feed');
    
    // Articles should load (give it time)
    cy.get('.article-preview', { timeout: 15000 }).should('have.length.greaterThan', 0);
  });

  it('should handle navigation between pages', () => {
    cy.visit('/');
    
    // Go to login
    cy.get('.navbar .nav-link[href="#/login"]').click();
    cy.url().should('include', '/login');
    
    // Go back to home
    cy.get('.navbar-brand').click();
    cy.url().should('not.include', '/login');
    
    // Go to register
    cy.get('.navbar .nav-link[href="#/register"]').click();
    cy.url().should('include', '/register');
  });

});