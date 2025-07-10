/**
 * Article Management E2E Tests
 * Tests article creation, editing, deletion, and viewing
 */

describe('Article Management', () => {
  let testUser;
  let testArticle;

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
    cy.intercept('POST', '**/articles').as('createArticle');
    cy.intercept('PUT', '**/articles/**').as('updateArticle');
    cy.intercept('DELETE', '**/articles/**').as('deleteArticle');
    cy.intercept('GET', '**/articles/**').as('getArticle');
    cy.intercept('POST', '**/articles/*/favorite').as('favoriteArticle');
    cy.intercept('DELETE', '**/articles/*/favorite').as('unfavoriteArticle');

    // Register and login user for tests that require authentication
    cy.registerUser(testUser);
  });

  describe('Article Creation', () => {
    it('should create a new article successfully', () => {
      cy.visit('/editor');
      cy.verifyURL('/editor');
      cy.waitForPageLoad();

      // Fill out article form
      cy.get('[placeholder="Article Title"]').clearAndType(testArticle.title);
      cy.get('[placeholder="What\'s this article about?"]').clearAndType(testArticle.description);
      cy.get('[placeholder="Write your article (in markdown)"]').clearAndType(testArticle.body);

      // Add tags
      testArticle.tagList.forEach(tag => {
        cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
        cy.get('.tag-default.tag-pill').should('contain', tag);
      });

      // Publish article
      cy.get('.btn-primary').contains('Publish Article').safeClick();

      // Wait for API call and verify redirect
      cy.waitForAPI('@createArticle');
      cy.url().should('include', '/article/');

      // Verify article content
      cy.get('.article-page h1').should('contain', testArticle.title);
      cy.get('.article-content').should('contain', testArticle.body.split('\\n')[0]);

      // Verify tags are displayed
      testArticle.tagList.forEach(tag => {
        cy.get('.tag-default').should('contain', tag);
      });

      // Verify author information
      cy.get('.article-meta .author').should('contain', testUser.username);
    });

    it('should validate required fields', () => {
      cy.visit('/editor');
      cy.waitForPageLoad();

      // Try to publish without filling required fields
      cy.get('.btn-primary').contains('Publish Article').safeClick();

      // Should stay on editor page (form validation)
      cy.verifyURL('/editor');

      // Fill only title and try again
      cy.get('[placeholder="Article Title"]').clearAndType('Test Title');
      cy.get('.btn-primary').contains('Publish Article').safeClick();

      // Should still stay on editor page
      cy.verifyURL('/editor');
    });

    it('should handle markdown content correctly', () => {
      cy.fixture('articles').then((articles) => {
        const markdownArticle = {
          ...articles.markdownArticle,
          title: 'Markdown Test ' + Date.now()
        };

        cy.visit('/editor');
        cy.waitForPageLoad();

        // Fill form with markdown content
        cy.get('[placeholder="Article Title"]').clearAndType(markdownArticle.title);
        cy.get('[placeholder="What\'s this article about?"]').clearAndType(markdownArticle.description);
        cy.get('[placeholder="Write your article (in markdown)"]').clearAndType(markdownArticle.body);

        // Add tags
        markdownArticle.tagList.forEach(tag => {
          cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
        });

        // Publish article
        cy.get('.btn-primary').contains('Publish Article').safeClick();
        cy.waitForAPI('@createArticle');

        // Verify markdown is rendered correctly
        cy.get('.article-page h1').should('contain', markdownArticle.title);
        cy.get('.article-content h1').should('exist'); // Markdown headers should be rendered
        cy.get('.article-content code').should('exist'); // Inline code should be rendered
        cy.get('.article-content pre').should('exist'); // Code blocks should be rendered
      });
    });

    it('should add and remove tags correctly', () => {
      cy.visit('/editor');
      cy.waitForPageLoad();

      // Add multiple tags
      const tags = ['react', 'testing', 'javascript', 'cypress'];
      tags.forEach(tag => {
        cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
        cy.get('.tag-default.tag-pill').should('contain', tag);
      });

      // Remove a tag
      cy.get('.tag-default.tag-pill').contains('testing').find('.ion-close-round').safeClick();
      cy.get('.tag-default.tag-pill').should('not.contain', 'testing');

      // Verify remaining tags
      cy.get('.tag-default.tag-pill').should('have.length', 3);
    });

    it('should navigate to home when canceling article creation', () => {
      cy.visit('/editor');
      cy.waitForPageLoad();

      // Navigate away from editor
      cy.get('.navbar-brand').safeClick();
      cy.verifyURL('/');
    });
  });

  describe('Article Editing', () => {
    let createdArticle;

    beforeEach(() => {
      // Create an article to edit
      cy.getCurrentUserToken().then(token => {
        cy.createArticleAPI(testArticle, token).then(article => {
          createdArticle = article;
        });
      });
    });

    it('should edit an existing article successfully', () => {
      cy.visit(`/editor/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Verify form is pre-filled
      cy.get('[placeholder="Article Title"]').should('have.value', testArticle.title);
      cy.get('[placeholder="What\'s this article about?"]').should('have.value', testArticle.description);

      // Update article content
      cy.fixture('articles').then((articles) => {
        const updatedData = articles.editedArticle;
        
        cy.get('[placeholder="Article Title"]').clear().type(updatedData.title);
        cy.get('[placeholder="What\'s this article about?"]').clear().type(updatedData.description);
        cy.get('[placeholder="Write your article (in markdown)"]').clear().type(updatedData.body);

        // Update tags
        cy.get('.tag-default.tag-pill .ion-close-round').each($el => {
          cy.wrap($el).click();
        });

        updatedData.tagList.forEach(tag => {
          cy.get('[placeholder="Enter tags"]').type(tag + '{enter}');
        });

        // Update article
        cy.get('.btn-primary').contains('Publish Article').safeClick();
        cy.waitForAPI('@updateArticle');

        // Verify updates
        cy.get('.article-page h1').should('contain', updatedData.title);
        cy.get('.article-content').should('contain', updatedData.body.split('\\n')[0]);
      });
    });

    it('should not allow editing articles by other users', () => {
      // Create another user
      const anotherUser = {
        username: 'anotheruser_' + Date.now(),
        email: 'anotheruser_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(anotherUser).then(() => {
        // Try to edit the original user's article
        cy.visit(`/editor/${createdArticle.slug}`);

        // Should redirect or show error (depending on implementation)
        // The exact behavior depends on how the app handles unauthorized access
        cy.url().should('not.include', `/editor/${createdArticle.slug}`);
      });
    });
  });

  describe('Article Viewing', () => {
    let createdArticle;

    beforeEach(() => {
      cy.getCurrentUserToken().then(token => {
        cy.createArticleAPI(testArticle, token).then(article => {
          createdArticle = article;
        });
      });
    });

    it('should display article content correctly', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();
      cy.waitForAPI('@getArticle');

      // Verify article content
      cy.get('.article-page h1').should('contain', testArticle.title);
      cy.get('.article-content').should('be.visible');

      // Verify article metadata
      cy.get('.article-meta .author').should('contain', testUser.username);
      cy.get('.article-meta .date').should('be.visible');

      // Verify tags
      testArticle.tagList.forEach(tag => {
        cy.get('.tag-default').should('contain', tag);
      });

      // Verify action buttons (for article author)
      cy.get('.article-actions .btn-outline-secondary').should('contain', 'Edit Article');
      cy.get('.article-actions .btn-outline-danger').should('contain', 'Delete Article');
    });

    it('should show favorite button for other users', () => {
      // Create another user and view the article
      const anotherUser = {
        username: 'viewer_' + Date.now(),
        email: 'viewer_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(anotherUser).then(() => {
        cy.visit(`/article/${createdArticle.slug}`);
        cy.waitForPageLoad();

        // Should show favorite button instead of edit/delete
        cy.get('.article-actions .btn-outline-primary').should('contain', 'Favorite Article');
        cy.get('.article-actions .btn-outline-secondary').should('contain', 'Follow');
      });
    });

    it('should handle non-existent articles gracefully', () => {
      cy.visit('/article/non-existent-article-slug');
      
      // Should handle 404 gracefully (exact behavior depends on implementation)
      cy.url().should('include', '/article/non-existent-article-slug');
    });
  });

  describe('Article Deletion', () => {
    let createdArticle;

    beforeEach(() => {
      cy.getCurrentUserToken().then(token => {
        cy.createArticleAPI(testArticle, token).then(article => {
          createdArticle = article;
        });
      });
    });

    it('should delete an article successfully', () => {
      cy.visit(`/article/${createdArticle.slug}`);
      cy.waitForPageLoad();

      // Click delete button
      cy.get('.article-actions .btn-outline-danger').contains('Delete Article').safeClick();

      // Wait for API call and verify redirect
      cy.waitForAPI('@deleteArticle');
      cy.verifyURL('/');

      // Verify article is no longer accessible
      cy.visit(`/article/${createdArticle.slug}`);
      // Should show 404 or redirect (depending on implementation)
    });

    it('should not show delete button for non-authors', () => {
      // Create another user
      const anotherUser = {
        username: 'viewer_' + Date.now(),
        email: 'viewer_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(anotherUser).then(() => {
        cy.visit(`/article/${createdArticle.slug}`);
        cy.waitForPageLoad();

        // Should not show delete button
        cy.get('.article-actions .btn-outline-danger').should('not.contain', 'Delete Article');
      });
    });
  });

  describe('Article Favoriting', () => {
    let createdArticle;

    beforeEach(() => {
      cy.getCurrentUserToken().then(token => {
        cy.createArticleAPI(testArticle, token).then(article => {
          createdArticle = article;
        });
      });
    });

    it('should favorite and unfavorite an article', () => {
      // Create another user to favorite the article
      const anotherUser = {
        username: 'favoriter_' + Date.now(),
        email: 'favoriter_' + Date.now() + '@test.com',
        password: 'password123'
      };

      cy.registerUser(anotherUser).then(() => {
        cy.visit(`/article/${createdArticle.slug}`);
        cy.waitForPageLoad();

        // Favorite the article
        cy.get('.article-actions .btn-outline-primary').contains('Favorite Article').then($btn => {
          const initialCount = parseInt($btn.text().match(/\\d+/) || ['0']);
          cy.wrap($btn).safeClick();
          cy.waitForAPI('@favoriteArticle');

          // Verify button state changed
          cy.get('.article-actions .btn-primary').should('contain', 'Unfavorite Article');
          cy.get('.article-actions .btn-primary').should('contain', initialCount + 1);
        });

        // Unfavorite the article
        cy.get('.article-actions .btn-primary').contains('Unfavorite Article').safeClick();
        cy.waitForAPI('@unfavoriteArticle');

        // Verify button state changed back
        cy.get('.article-actions .btn-outline-primary').should('contain', 'Favorite Article');
      });
    });
  });

  describe('Article Navigation', () => {
    it('should navigate between articles and maintain state', () => {
      // Create multiple articles
      const articles = [];
      cy.getCurrentUserToken().then(token => {
        for (let i = 0; i < 2; i++) {
          const articleData = {
            ...testArticle,
            title: `Test Article ${Date.now()}_${i}`
          };
          cy.createArticleAPI(articleData, token).then(article => {
            articles.push(article);
          });
        }
      });

      // Navigate through articles
      cy.visit('/');
      cy.waitForPageLoad();

      // Click on first article
      cy.get('.article-preview h1 a').first().safeClick();
      cy.url().should('include', '/article/');

      // Navigate back to home
      cy.get('.navbar-brand').safeClick();
      cy.verifyURL('/');

      // Should maintain article list state
      cy.get('.article-preview').should('have.length.greaterThan', 0);
    });
  });
});