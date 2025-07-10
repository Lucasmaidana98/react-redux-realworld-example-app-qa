/**
 * User profile and interaction related custom commands
 */

/**
 * Visit user profile
 */
Cypress.Commands.add('visitUserProfile', (username) => {
  cy.visit(`/@${username}`);
  cy.waitForPageLoad();
  cy.get('.user-info h4').should('contain', username);
});

/**
 * Follow/unfollow user
 */
Cypress.Commands.add('toggleFollowUser', (username) => {
  cy.visitUserProfile(username);
  
  cy.get('.user-info .action-btn')
    .should('be.visible')
    .safeClick();
  
  // Wait for the button text to change
  cy.get('.user-info .action-btn').should('be.visible');
});

/**
 * Update user profile via UI
 */
Cypress.Commands.add('updateUserProfile', (profileData) => {
  cy.visit('/settings');
  cy.waitForPageLoad();
  
  if (profileData.image) {
    cy.get('[placeholder="URL of profile picture"]').clearAndType(profileData.image);
  }
  if (profileData.username) {
    cy.get('[placeholder="Your Name"]').clearAndType(profileData.username);
  }
  if (profileData.bio) {
    cy.get('[placeholder="Short bio about you"]').clearAndType(profileData.bio);
  }
  if (profileData.email) {
    cy.get('[placeholder="Email"]').clearAndType(profileData.email);
  }
  if (profileData.password) {
    cy.get('[placeholder="Password"]').clearAndType(profileData.password);
  }
  
  cy.get('.btn-primary').contains('Update Settings').safeClick();
  
  // Verify update success (should redirect to profile)
  cy.url().should('include', '/@');
});

/**
 * Get user articles from profile
 */
Cypress.Commands.add('getUserArticles', (username) => {
  cy.visitUserProfile(username);
  
  cy.get('.articles-toggle .nav-link').contains('My Articles').safeClick();
  cy.waitForPageLoad();
  
  return cy.get('.article-preview').then($articles => {
    return $articles.length;
  });
});

/**
 * Get user favorited articles
 */
Cypress.Commands.add('getUserFavoritedArticles', (username) => {
  cy.visitUserProfile(username);
  
  cy.get('.articles-toggle .nav-link').contains('Favorited Articles').safeClick();
  cy.waitForPageLoad();
  
  return cy.get('.article-preview').then($articles => {
    return $articles.length;
  });
});

/**
 * Verify user profile information
 */
Cypress.Commands.add('verifyUserProfile', (expectedData) => {
  if (expectedData.username) {
    cy.get('.user-info h4').should('contain', expectedData.username);
  }
  if (expectedData.bio) {
    cy.get('.user-info p').should('contain', expectedData.bio);
  }
  if (expectedData.image) {
    cy.get('.user-img').should('have.attr', 'src', expectedData.image);
  }
});

/**
 * Check if user is being followed
 */
Cypress.Commands.add('isUserFollowed', (username) => {
  cy.visitUserProfile(username);
  
  return cy.get('.user-info .action-btn').then($btn => {
    return $btn.text().includes('Unfollow');
  });
});

/**
 * Get follow count for user
 */
Cypress.Commands.add('getFollowCount', (username) => {
  cy.visitUserProfile(username);
  
  // Note: The RealWorld app doesn't show follower counts in the UI
  // This is a placeholder for potential future functionality
  return cy.wrap(0);
});

/**
 * Search for user (if search functionality exists)
 */
Cypress.Commands.add('searchForUser', (searchTerm) => {
  // Note: The RealWorld app doesn't have a user search feature
  // This is a placeholder for potential future functionality
  cy.log('User search functionality not available in RealWorld app');
});

/**
 * Verify user is in navigation
 */
Cypress.Commands.add('verifyUserInNavigation', (username) => {
  cy.get('.navbar .nav-link').should('contain', username);
});

/**
 * Navigate to user settings
 */
Cypress.Commands.add('navigateToSettings', () => {
  cy.get('.navbar .nav-link[href="#/settings"]').safeClick();
  cy.verifyURL('/settings');
});

/**
 * Navigate to user profile from navbar
 */
Cypress.Commands.add('navigateToOwnProfile', (username) => {
  cy.get('.navbar .nav-link').contains(username).safeClick();
  cy.verifyURL(`/@${username}`);
});