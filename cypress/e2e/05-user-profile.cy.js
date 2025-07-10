/**
 * User Profile E2E Tests
 * Tests user profile viewing, editing, following, and profile-related functionality
 */

describe('User Profile Functionality', () => {
  let testUser;
  let secondUser;
  let testArticle;

  beforeEach(() => {
    cy.fixture('users').then((users) => {
      testUser = {
        ...users.validUser,
        username: 'testuser_' + Date.now(),
        email: 'testuser_' + Date.now() + '@test.com'
      };

      secondUser = {
        ...users.secondUser,
        username: 'seconduser_' + Date.now(),
        email: 'seconduser_' + Date.now() + '@test.com'
      };
    });

    cy.fixture('articles').then((articles) => {
      testArticle = {
        ...articles.sampleArticle,
        title: 'Profile Test Article ' + Date.now()
      };
    });

    // Setup API interceptors
    cy.intercept('GET', '**/profiles/**').as('getProfile');
    cy.intercept('POST', '**/profiles/*/follow').as('followUser');
    cy.intercept('DELETE', '**/profiles/*/follow').as('unfollowUser');
    cy.intercept('PUT', '**/user').as('updateUser');
    cy.intercept('GET', '**/articles?author=**').as('getAuthorArticles');
    cy.intercept('GET', '**/articles?favorited=**').as('getFavoritedArticles');

    // Register test users
    cy.registerUser(testUser);
  });

  describe('Profile Viewing', () => {
    it('should display user profile correctly', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Verify profile information
      cy.get('.user-info h4').should('contain', testUser.username);
      cy.get('.user-img').should('be.visible');
      
      // Check if bio is displayed (if user has one)
      if (testUser.bio) {
        cy.get('.user-info p').should('contain', testUser.bio);
      }

      // Verify profile tabs
      cy.get('.articles-toggle .nav-link').should('contain', 'My Articles');
      cy.get('.articles-toggle .nav-link').should('contain', 'Favorited Articles');

      // Should show edit profile button for own profile
      cy.get('.user-info .action-btn').should('contain', 'Edit Profile Settings');
    });

    it('should display another users profile correctly', () => {
      // Register second user
      cy.registerUser(secondUser).then(() => {
        // Login as first user and view second user's profile
        cy.clearAuth();
        cy.loginUserAPI(testUser);
        cy.visitUserProfile(secondUser.username);
        cy.waitForAPI('@getProfile');

        // Verify profile information
        cy.get('.user-info h4').should('contain', secondUser.username);

        // Should show follow button for other user's profile
        cy.get('.user-info .action-btn').should('contain', 'Follow');
        cy.get('.user-info .action-btn').should('not.contain', 'Edit Profile Settings');
      });
    });

    it('should navigate to profile from navbar', () => {
      cy.visit('/');
      cy.waitForPageLoad();

      // Click on username in navbar
      cy.get('.navbar .nav-link').contains(testUser.username).safeClick();
      cy.verifyURL(`/@${testUser.username}`);
      cy.get('.user-info h4').should('contain', testUser.username);
    });

    it('should handle non-existent user profiles', () => {
      cy.visit('/@nonexistentuser');
      
      // Should handle 404 gracefully (exact behavior depends on implementation)
      cy.url().should('include', '/@nonexistentuser');
    });
  });

  describe('Profile Articles', () => {
    beforeEach(() => {
      // Create test articles for the user
      cy.getCurrentUserToken().then(token => {
        cy.createArticleAPI(testArticle, token);
      });
    });

    it('should display user articles in My Articles tab', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Default should be My Articles tab
      cy.get('.articles-toggle .nav-link.active').should('contain', 'My Articles');
      cy.waitForAPI('@getAuthorArticles');

      // Should display user's articles
      cy.get('.article-preview').should('have.length.greaterThan', 0);
      cy.get('.article-preview h1 a').should('contain', testArticle.title);
      cy.get('.article-preview .article-meta .author').should('contain', testUser.username);
    });

    it('should switch to Favorited Articles tab', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Switch to Favorited Articles tab
      cy.get('.articles-toggle .nav-link').contains('Favorited Articles').safeClick();
      cy.waitForAPI('@getFavoritedArticles');

      // Tab should be active
      cy.get('.articles-toggle .nav-link.active').should('contain', 'Favorited Articles');

      // URL should reflect the tab change
      cy.url().should('include', '/favorites');
    });

    it('should navigate to article from profile', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getAuthorArticles');

      // Click on article title
      cy.get('.article-preview h1 a').contains(testArticle.title).safeClick();

      // Should navigate to article page
      cy.url().should('include', '/article/');
      cy.get('.article-page h1').should('contain', testArticle.title);
    });

    it('should handle empty article lists gracefully', () => {
      // Create a new user with no articles
      const newUser = {
        username: 'newuser_' + Date.now(),
        email: 'newuser_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(newUser).then(() => {
        cy.visitUserProfile(newUser.username);
        cy.waitForAPI('@getProfile');

        // Should handle empty articles list
        cy.get('.articles-toggle').should('be.visible');
        // May show empty state or no articles message
      });
    });
  });

  describe('Following Functionality', () => {
    beforeEach(() => {
      // Register second user for follow tests
      cy.registerUser(secondUser);
    });

    it('should follow another user successfully', () => {
      // Login as first user
      cy.clearAuth();
      cy.loginUserAPI(testUser);

      // Visit second user's profile
      cy.visitUserProfile(secondUser.username);
      cy.waitForAPI('@getProfile');

      // Click follow button
      cy.get('.user-info .action-btn').contains('Follow').safeClick();
      cy.waitForAPI('@followUser');

      // Button should change to Unfollow
      cy.get('.user-info .action-btn').should('contain', 'Unfollow');
    });

    it('should unfollow a user successfully', () => {
      // Login as first user and follow second user first
      cy.clearAuth();
      cy.loginUserAPI(testUser);
      cy.visitUserProfile(secondUser.username);
      cy.waitForAPI('@getProfile');

      // Follow user
      cy.get('.user-info .action-btn').contains('Follow').safeClick();
      cy.waitForAPI('@followUser');

      // Now unfollow
      cy.get('.user-info .action-btn').contains('Unfollow').safeClick();
      cy.waitForAPI('@unfollowUser');

      // Button should change back to Follow
      cy.get('.user-info .action-btn').should('contain', 'Follow');
    });

    it('should not show follow button for own profile', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Should show edit profile settings, not follow button
      cy.get('.user-info .action-btn').should('contain', 'Edit Profile Settings');
      cy.get('.user-info .action-btn').should('not.contain', 'Follow');
    });

    it('should not show follow button for unauthenticated users', () => {
      cy.clearAuth();
      cy.visitUserProfile(testUser.username);

      // Follow button should not be visible for unauthenticated users
      cy.get('.user-info .action-btn').should('not.exist');
    });
  });

  describe('Profile Settings', () => {
    it('should navigate to settings from profile', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Click edit profile settings
      cy.get('.user-info .action-btn').contains('Edit Profile Settings').safeClick();
      cy.verifyURL('/settings');
    });

    it('should update profile information successfully', () => {
      cy.fixture('users').then((users) => {
        const updateData = users.updateProfile;

        cy.visit('/settings');
        cy.waitForPageLoad();

        // Update profile fields
        if (updateData.image) {
          cy.get('[placeholder="URL of profile picture"]').clear().type(updateData.image);
        }
        if (updateData.username) {
          cy.get('[placeholder="Your Name"]').clear().type(updateData.username);
        }
        if (updateData.bio) {
          cy.get('[placeholder="Short bio about you"]').clear().type(updateData.bio);
        }
        if (updateData.email) {
          cy.get('[placeholder="Email"]').clear().type(updateData.email);
        }

        // Update settings
        cy.get('.btn-primary').contains('Update Settings').safeClick();
        cy.waitForAPI('@updateUser');

        // Should redirect to updated profile
        cy.url().should('include', '/@');
        
        // Verify updates are reflected
        if (updateData.username) {
          cy.get('.user-info h4').should('contain', updateData.username);
        }
        if (updateData.bio) {
          cy.get('.user-info p').should('contain', updateData.bio);
        }
      });
    });

    it('should validate profile update fields', () => {
      cy.visit('/settings');
      cy.waitForPageLoad();

      // Try to submit with invalid email
      cy.get('[placeholder="Email"]').clear().type('invalid-email');
      cy.get('.btn-primary').contains('Update Settings').safeClick();

      // Should stay on settings page or show validation error
      cy.verifyURL('/settings');
    });

    it('should update password successfully', () => {
      cy.visit('/settings');
      cy.waitForPageLoad();

      const newPassword = 'newpassword123';

      // Update password
      cy.get('[placeholder="Password"]').clear().type(newPassword);
      cy.get('.btn-primary').contains('Update Settings').safeClick();
      cy.waitForAPI('@updateUser');

      // Should be able to login with new password
      cy.logoutUser();
      cy.loginUserUI({ ...testUser, password: newPassword });
      cy.verifyURL('/');
    });
  });

  describe('Profile Navigation and UX', () => {
    it('should maintain profile state during navigation', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Switch to favorited articles
      cy.get('.articles-toggle .nav-link').contains('Favorited Articles').safeClick();
      cy.waitForAPI('@getFavoritedArticles');

      // Navigate away and back
      cy.get('.navbar-brand').safeClick();
      cy.verifyURL('/');

      // Navigate back to profile
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Should default back to My Articles tab
      cy.get('.articles-toggle .nav-link.active').should('contain', 'My Articles');
    });

    it('should handle profile loading states', () => {
      // Visit profile page
      cy.visit(`/@${testUser.username}`);

      // Should show loading state or handle gracefully
      cy.get('body').should('be.visible');
      
      // Eventually profile should load
      cy.get('.user-info h4', { timeout: 10000 }).should('contain', testUser.username);
    });

    it('should be responsive on different screen sizes', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Test mobile responsiveness
      cy.viewport('iphone-6');
      cy.get('.user-info').should('be.visible');
      cy.get('.articles-toggle').should('be.visible');

      // Test tablet responsiveness
      cy.viewport('ipad-2');
      cy.get('.user-info').should('be.visible');
      cy.get('.articles-toggle').should('be.visible');
    });
  });

  describe('Profile Integration', () => {
    it('should maintain user profile consistency across the app', () => {
      cy.visitUserProfile(testUser.username);
      cy.waitForAPI('@getProfile');

      // Navigate to create article
      cy.get('.navbar .nav-link[href="#/editor"]').safeClick();
      cy.verifyURL('/editor');

      // User should still be authenticated
      cy.get('.navbar .nav-link').should('contain', testUser.username);

      // Navigate back to profile
      cy.get('.navbar .nav-link').contains(testUser.username).safeClick();
      cy.verifyURL(`/@${testUser.username}`);
    });

    it('should show updated profile information immediately after changes', () => {
      const newBio = 'Updated bio ' + Date.now();

      // Update profile
      cy.visit('/settings');
      cy.waitForPageLoad();
      cy.get('[placeholder="Short bio about you"]').clear().type(newBio);
      cy.get('.btn-primary').contains('Update Settings').safeClick();
      cy.waitForAPI('@updateUser');

      // Profile should show updated information
      cy.get('.user-info p').should('contain', newBio);
    });
  });
});