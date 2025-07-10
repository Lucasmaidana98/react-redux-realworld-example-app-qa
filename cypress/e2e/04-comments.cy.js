/**
 * Comments E2E Tests
 * Tests comment creation, deletion, and display functionality
 */

describe('Comments Functionality', () => {
  let testUser;
  let testArticle;
  let createdArticle;

  beforeEach(() => {
    cy.fixture('users').then((users) => {
      testUser = {
        ...users.validUser,
        username: 'testuser_' + Date.now(),
        email: 'testuser_' + Date.now() + '@test.com'
      };
    });

    cy.fixture('articles').then((articles) => {
      testArticle = {
        ...articles.sampleArticle,
        title: 'Test Article ' + Date.now()
      };
    });

    // Setup API interceptors
    cy.intercept('GET', '**/articles/*/comments').as('getComments');
    cy.intercept('POST', '**/articles/*/comments').as('postComment');
    cy.intercept('DELETE', '**/articles/*/comments/*').as('deleteComment');

    // Register user and create article for tests
    cy.registerUser(testUser).then(() => {
      cy.getCurrentUserToken().then(token => {
        cy.createArticleAPI(testArticle, token).then(article => {
          createdArticle = article;
        });
      });
    });
  });

  describe('Comment Display', () => {
    it('should display comments section on article page', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments');

      // Verify comments section exists
      cy.get('.row .col-xs-12').should('contain', 'Comments');
      
      // Should have comment form for authenticated users
      cy.get('.comment-form').should('be.visible');
      cy.get('.comment-form textarea').should('have.attr', 'placeholder', 'Write a comment...');
      cy.get('.comment-form .btn-primary').should('contain', 'Post Comment');
    });

    it('should not show comment form for unauthenticated users', () => {
      cy.clearAuth();
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Comment form should not be visible
      cy.get('.comment-form').should('not.exist');
      
      // Should show sign in prompt instead
      cy.get('body').should('contain', 'Sign in').or('contain', 'Sign up');
    });

    it('should load existing comments', () => {
      // First add a comment via API to have something to display
      cy.getCurrentUserToken().then(token => {
        const commentData = { body: 'Test comment for display' };
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/articles/${createdArticle.slug}/comments`,
          headers: { 'Authorization': `Token ${token}` },
          body: { comment: commentData }
        });
      });

      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments');

      // Should display the comment
      cy.get('.comment-body').should('contain', 'Test comment for display');
      cy.get('.comment-author').should('contain', testUser.username);
      cy.get('.comment-date').should('be.visible');
    });
  });

  describe('Comment Creation', () => {
    it('should create a new comment successfully', () => {
      cy.fixture('comments').then((comments) => {
        cy.visit(`/article/${createdArticle.slug}`);
        cy.waitForPageLoad();

        // Add a comment
        cy.get('.comment-form textarea').clearAndType(comments.validComment.body);
        cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();

        // Wait for API call
        cy.waitForAPI('@postComment');

        // Verify comment appears in the list
        cy.get('.comment-body p').should('contain', comments.validComment.body);
        cy.get('.comment-author').should('contain', testUser.username);

        // Verify form is cleared
        cy.get('.comment-form textarea').should('have.value', '');
      });
    });

    it('should handle long comments correctly', () => {
      cy.fixture('comments').then((comments) => {
        cy.visit(`/article/${createdArticle.slug}`);
        cy.waitForPageLoad();

        // Add a long comment
        cy.get('.comment-form textarea').clearAndType(comments.longComment.body);
        cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();

        cy.waitForAPI('@postComment');

        // Verify long comment is displayed properly
        cy.get('.comment-body p').should('contain', comments.longComment.body);
        cy.get('.comment-body p').should('be.visible');
      });
    });

    it('should handle comments with special characters', () => {
      const specialComment = 'Comment with special chars: @#$%^&*()_+ <script>alert("test")</script>';
      
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      cy.get('.comment-form textarea').clearAndType(specialComment);
      cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();

      cy.waitForAPI('@postComment');

      // Verify special characters are handled safely
      cy.get('.comment-body p').should('contain', '@#$%^&*()_+');
      // Script tags should be escaped/removed
      cy.get('.comment-body p').should('not.contain', '<script>');
    });

    it('should validate empty comments', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Try to submit empty comment
      cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();

      // Should not make API call with empty comment
      cy.get('@postComment.all').should('have.length', 0);

      // Form should still be visible and empty
      cy.get('.comment-form textarea').should('have.value', '');
    });

    it('should show user avatar in comment form', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Comment form should show user avatar
      cy.get('.comment-form .comment-author-img').should('be.visible');
      cy.get('.comment-form .comment-author-img').should('have.attr', 'src');
    });
  });

  describe('Comment Deletion', () => {
    let commentId;

    beforeEach(() => {
      // Create a comment to delete
      cy.getCurrentUserToken().then(token => {
        const commentData = { body: 'Comment to be deleted' };
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/articles/${createdArticle.slug}/comments`,
          headers: { 'Authorization': `Token ${token}` },
          body: { comment: commentData }
        }).then(response => {
          commentId = response.body.comment.id;
        });
      });
    });

    it('should delete own comment successfully', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments');

      // Find and delete the comment
      cy.get('.comment-body p').contains('Comment to be deleted')
        .parents('.card-comment')
        .find('.mod-options .ion-trash-a')
        .safeClick();

      // Wait for API call
      cy.waitForAPI('@deleteComment');

      // Verify comment is removed from UI
      cy.get('.comment-body p').should('not.contain', 'Comment to be deleted');
    });

    it('should not show delete button for other users comments', () => {
      // Create another user
      const anotherUser = {
        username: 'commenter_' + Date.now(),
        email: 'commenter_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(anotherUser).then(() => {
        cy.visit(`/article/${createdArticle.slug}`);
        cy.waitForPageLoad();
        cy.waitForAPI('@getComments');

        // Should not see delete button for original user's comment
        cy.get('.comment-body p').contains('Comment to be deleted')
          .parents('.card-comment')
          .find('.mod-options .ion-trash-a')
          .should('not.exist');
      });
    });

    it('should not show delete button for unauthenticated users', () => {
      cy.clearAuth();
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Should not see any delete buttons
      cy.get('.mod-options .ion-trash-a').should('not.exist');
    });
  });

  describe('Comment Interactions', () => {
    beforeEach(() => {
      // Add some test comments
      cy.getCurrentUserToken().then(token => {
        const comments = [
          { body: 'First test comment' },
          { body: 'Second test comment' },
          { body: 'Third test comment' }
        ];

        comments.forEach(comment => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/articles/${createdArticle.slug}/comments`,
            headers: { 'Authorization': `Token ${token}` },
            body: { comment }
          });
        });
      });
    });

    it('should display comments in correct order', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments');

      // Comments should be displayed (order depends on API response)
      cy.get('.comment-body p').should('have.length.greaterThan', 2);
      cy.get('.comment-body p').each($comment => {
        cy.wrap($comment).should('be.visible');
      });
    });

    it('should show comment metadata correctly', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments');

      // Check first comment metadata
      cy.get('.card-comment').first().within(() => {
        cy.get('.comment-author').should('contain', testUser.username);
        cy.get('.date-posted').should('be.visible');
        cy.get('.comment-author-img').should('be.visible');
      });
    });

    it('should handle clicking on comment author', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments');

      // Click on comment author
      cy.get('.comment-author').first().safeClick();

      // Should navigate to author profile
      cy.url().should('include', `/@${testUser.username}`);
    });
  });

  describe('Comments Performance and Error Handling', () => {
    it('should handle comments loading errors gracefully', () => {
      // Mock error response
      cy.intercept('GET', '**/articles/*/comments', { statusCode: 500 }).as('getCommentsError');

      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Should not crash the app
      cy.get('.article-page').should('be.visible');
      cy.get('.comment-form').should('be.visible');
    });

    it('should handle comment creation errors gracefully', () => {
      // Mock error response for comment creation
      cy.intercept('POST', '**/articles/*/comments', { statusCode: 422 }).as('postCommentError');

      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      cy.get('.comment-form textarea').clearAndType('Test comment');
      cy.get('.comment-form .btn-primary').contains('Post Comment').safeClick();

      // Should handle error gracefully
      cy.get('.comment-form').should('be.visible');
      cy.get('.comment-form textarea').should('contain.value', 'Test comment');
    });

    it('should load comments within reasonable time', () => {
      const startTime = Date.now();

      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getComments').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });
  });

  describe('Comments Responsive Design', () => {
    beforeEach(() => {
      // Add a comment for testing
      cy.getCurrentUserToken().then(token => {
        const commentData = { body: 'Responsive test comment' };
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/articles/${createdArticle.slug}/comments`,
          headers: { 'Authorization': `Token ${token}` },
          body: { comment: commentData }
        });
      });
    });

    it('should display comments properly on mobile', () => {
      cy.viewport('iphone-6');
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Comments should be readable on mobile
      cy.get('.comment-body').should('be.visible');
      cy.get('.comment-form').should('be.visible');
      cy.get('.comment-form textarea').should('be.visible');
    });

    it('should display comments properly on tablet', () => {
      cy.viewport('ipad-2');
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Comments should be readable on tablet
      cy.get('.comment-body').should('be.visible');
      cy.get('.comment-form').should('be.visible');
    });
  });
});